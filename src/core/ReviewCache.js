/**
 * 评测字典缓存管理器 - v3.0 增强版
 * 负责构建、查询、持久化好友评测字典
 *
 * v3.0 新增：
 * - 分段构建：支持暂停/继续
 * - 断点续传：中断后可从上次位置继续
 * - 进度保存：实时保存已处理的好友数据
 */

class ReviewCache {
  constructor() {
    this.logger = new Logger('ReviewCache');
    this.extractor = new ReviewListExtractor();
    this.throttler = new Throttler(); // 限流器

    // 字典结构：{ steamId: [appId1, appId2, ...] }
    this.friendReviewsMap = {};

    // 缓存键
    this.cacheKey = `${Constants.CACHE_KEY_PREFIX}review_dict_${Constants.CACHE_VERSION}`;
    this.progressKey = `${Constants.CACHE_KEY_PREFIX}build_progress_${Constants.CACHE_VERSION}`;

    // 构建状态
    this.isBuilding = false;
    this.isPaused = false;
    this.currentIndex = 0;
    this.friendIds = [];
    this.startTime = 0;

    // 回调
    this.onProgress = null;
    this.onComplete = null;
    this.onPause = null;
  }

  /**
   * 构建所有好友的评测字典（支持断点续传）
   * @param {Array<string>} friendIds - 好友 Steam ID 列表
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 评测字典
   */
  async buildCache(friendIds, options = {}) {
    // 兼容旧 API：如果第二个参数是函数，转换为 options
    if (typeof options === 'function') {
      options = { onProgress: options };
    }

    this.onProgress = options.onProgress || null;
    this.onComplete = options.onComplete || null;
    this.onPause = options.onPause || null;

    this.logger.info('========================================');
    this.logger.info('  📚 字典模式 - 构建评测字典');
    this.logger.info('========================================');
    this.logger.info('');

    // 检查是否有未完成的构建进度
    const savedProgress = this.loadBuildProgress();
    if (savedProgress && savedProgress.friendIds.length === friendIds.length) {
      this.logger.info(`🔄 检测到未完成的构建进度`);
      this.logger.info(`   已处理: ${savedProgress.currentIndex}/${friendIds.length}`);
      this.logger.info(`   是否继续? 调用 FRF.resumeBuild() 继续，或 FRF.clearProgress() 重新开始`);
      this.logger.info('');

      // 恢复状态
      this.friendIds = savedProgress.friendIds;
      this.currentIndex = savedProgress.currentIndex;
      this.friendReviewsMap = savedProgress.data;
      return this.friendReviewsMap;
    }

    // 全新构建
    this.friendIds = friendIds;
    this.currentIndex = 0;
    this.friendReviewsMap = {};
    this.startTime = Date.now();

    this.logger.info(`开始构建评测字典，共 ${friendIds.length} 个好友`);

    const batchSize = this.throttler.getBatchSize();
    const delay = this.throttler.getDelay();
    this.logger.info(`⚙️ 配置: 批次=${batchSize}, 延迟=${delay}ms`);
    this.logger.info('');

    this.isBuilding = true;
    this.isPaused = false;

    await this.processFriends();

    return this.friendReviewsMap;
  }

  /**
   * 处理好友列表（支持暂停）
   */
  async processFriends() {
    const batchSize = this.throttler.getBatchSize();
    const delay = this.throttler.getDelay();
    const total = this.friendIds.length;

    while (this.currentIndex < total) {
      // 检查暂停
      if (this.isPaused) {
        this.logger.info(`⏸️ 已暂停 (${this.currentIndex}/${total})`);
        this.saveBuildProgress();
        if (this.onPause) {
          this.onPause(this.currentIndex, total);
        }
        return;
      }

      // 获取当前批次
      const batch = this.friendIds.slice(
        this.currentIndex,
        Math.min(this.currentIndex + batchSize, total)
      );

      // 并发处理当前批次
      const promises = batch.map(steamId => this.processFriend(steamId));
      await Promise.all(promises);

      this.currentIndex += batch.length;

      // 计算 ETA
      const elapsed = Date.now() - this.startTime;
      const avgPerFriend = elapsed / this.currentIndex;
      const remaining = (total - this.currentIndex) * avgPerFriend;
      const eta = this.formatTime(remaining);

      // 进度回调
      if (this.onProgress) {
        this.onProgress(this.currentIndex, total, Object.keys(this.friendReviewsMap).length, eta);
      }

      // 每 9 个好友显示一次进度
      if (this.currentIndex % 9 === 0 || this.currentIndex === total) {
        this.logger.info(
          `📊 进度: ${this.currentIndex}/${total}, ` +
          `已收录: ${Object.keys(this.friendReviewsMap).length} 个好友, ` +
          `预计剩余: ${eta}`
        );
      }

      // 定期保存进度（每 30 个好友）
      if (this.currentIndex % 30 === 0) {
        this.saveBuildProgress();
      }

      // 批次延迟
      if (this.currentIndex < total && !this.isPaused) {
        await this.delay(delay);
      }
    }

    // 构建完成
    this.isBuilding = false;
    this.clearBuildProgress();
    this.saveToCache();

    const elapsed = this.formatTime(Date.now() - this.startTime);
    this.logger.info('');
    this.logger.info('========================================');
    this.logger.info('  ✅ 字典构建完成！');
    this.logger.info('========================================');
    this.logger.info(`📊 共收录 ${Object.keys(this.friendReviewsMap).length} 个好友的评测数据`);
    this.logger.info(`⏱️ 总耗时: ${elapsed}`);
    this.logger.info('');

    if (this.onComplete) {
      this.onComplete(this.friendReviewsMap);
    }
  }

  /**
   * 查找哪些好友评测了指定游戏
   * @param {string} appId - 游戏 App ID
   * @returns {Array<string>} Steam ID 数组
   */
  findFriendsWithReview(appId) {
    const matchedFriends = Object.keys(this.friendReviewsMap).filter(
      steamId => this.friendReviewsMap[steamId].includes(appId)
    );

    this.logger.info(`游戏 ${appId} 匹配到 ${matchedFriends.length} 个好友`);
    return matchedFriends;
  }

  /**
   * 从缓存加载
   * @returns {boolean} 是否成功加载
   */
  loadFromCache() {
    const cached = localStorage.getItem(this.cacheKey);
    if (!cached) {
      this.logger.info('无缓存数据');
      return false;
    }

    try {
      const { timestamp, data, version } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // 检查版本和有效期
      if (version !== Constants.CACHE_VERSION) {
        this.logger.info(`缓存版本不匹配: ${version} != ${Constants.CACHE_VERSION}`);
        return false;
      }

      if (age >= Constants.CACHE_DURATION) {
        this.logger.info(`缓存已过期 (${(age / 86400000).toFixed(1)} 天)`);
        return false;
      }

      this.friendReviewsMap = data;
      this.logger.info(`成功加载缓存 (${Object.keys(data).length} 个好友, ${(age / 3600000).toFixed(1)} 小时前)`);

      return true;

    } catch (error) {
      this.logger.error('加载缓存失败', error);
      return false;
    }
  }

  /**
   * 保存到 LocalStorage
   */
  saveToCache() {
    try {
      const cacheData = {
        version: Constants.CACHE_VERSION,
        timestamp: Date.now(),
        data: this.friendReviewsMap
      };

      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      this.logger.info('缓存已保存');

    } catch (error) {
      this.logger.error('保存缓存失败', error);
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    localStorage.removeItem(this.cacheKey);
    this.friendReviewsMap = {};
    this.logger.info('缓存已清除');
  }

  /**
   * 添加单条评测记录到缓存（用于快速模式同步）
   * @param {string} steamId - 好友 Steam ID
   * @param {string} appId - 游戏 App ID
   */
  addReviewToCache(steamId, appId) {
    if (!this.friendReviewsMap[steamId]) {
      this.friendReviewsMap[steamId] = [];
    }
    if (!this.friendReviewsMap[steamId].includes(appId)) {
      this.friendReviewsMap[steamId].push(appId);
    }
  }

  /**
   * 从缓存中移除指定游戏的评测记录（用于后台更新发现删除的评测）
   * @param {string} steamId - 好友 Steam ID
   * @param {string} appId - 游戏 App ID
   */
  removeReviewFromCache(steamId, appId) {
    if (this.friendReviewsMap[steamId]) {
      const index = this.friendReviewsMap[steamId].indexOf(appId);
      if (index !== -1) {
        this.friendReviewsMap[steamId].splice(index, 1);
        // 如果该好友没有评测记录了，删除整个条目
        if (this.friendReviewsMap[steamId].length === 0) {
          delete this.friendReviewsMap[steamId];
        }
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    const friendsCount = Object.keys(this.friendReviewsMap).length;
    const totalReviews = Object.values(this.friendReviewsMap).reduce((sum, arr) => sum + arr.length, 0);

    return {
      friendsWithReviews: friendsCount,
      totalReviews: totalReviews,
      cacheAge: this.getCacheAge()
    };
  }

  /**
   * 获取缓存年龄（小时）
   */
  getCacheAge() {
    const cached = localStorage.getItem(this.cacheKey);
    if (!cached) return null;

    try {
      const { timestamp } = JSON.parse(cached);
      const ageMs = Date.now() - timestamp;
      return (ageMs / 3600000).toFixed(1);
    } catch {
      return null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

if (typeof window !== 'undefined') {
  window.FRF_ReviewCache = ReviewCache;
}
