/**
 * 评测字典缓存管理器 - 新架构核心模块
 * 负责构建、查询、持久化好友评测字典
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
  }

  /**
   * 构建所有好友的评测字典
   * @param {Array<string>} friendIds - 好友 Steam ID 列表
   * @param {Function} onProgress - 进度回调 (current, total, built)
   * @returns {Promise<Object>} 评测字典
   */
  async buildCache(friendIds, onProgress = null) {
    this.logger.time('构建评测字典');
    this.logger.info(`开始构建评测字典，共 ${friendIds.length} 个好友`);

    const batchSize = this.throttler.getBatchSize();
    const delay = this.throttler.getDelay();
    this.logger.info(`🔧 配置: 批次大小=${batchSize}, 延迟=${delay}ms`);
    this.logger.info('');

    this.friendReviewsMap = {};
    let processedCount = 0;

    // 批量处理
    for (let i = 0; i < friendIds.length; i += batchSize) {
      const batch = friendIds.slice(i, Math.min(i + batchSize, friendIds.length));

      // 并发处理当前批次
      const promises = batch.map(steamId => this.processFriend(steamId));
      await Promise.all(promises);

      processedCount += batch.length;

      // 进度回调
      if (onProgress) {
        onProgress(processedCount, friendIds.length, Object.keys(this.friendReviewsMap).length);
      }

      // 每 9 个好友（3批）显示一次进度
      if (processedCount % 9 === 0 || processedCount === friendIds.length) {
        this.logger.info(
          `📊 进度: ${processedCount}/${friendIds.length}, ` +
          `已收录: ${Object.keys(this.friendReviewsMap).length} 个好友`
        );
      }

      // 批次之间延迟
      if (processedCount < friendIds.length) {
        await this.delay(delay);
      }
    }

    // 保存到本地缓存
    this.saveToCache();

    this.logger.timeEnd('构建评测字典');
    this.logger.info('');
    this.logger.info(`✅ 字典构建完成！`);
    this.logger.info(`   📊 共收录 ${Object.keys(this.friendReviewsMap).length} 个好友的评测数据`);
    this.logger.info('');

    return this.friendReviewsMap;
  }

  /**
   * 处理单个好友
   */
  async processFriend(steamId) {
    try {
      const appIds = await this.extractor.extractFriendReviewGames(steamId);

      // 只缓存有评测的好友
      if (appIds.length > 0) {
        this.friendReviewsMap[steamId] = appIds;
      }

    } catch (error) {
      this.logger.warn(`处理好友 ${steamId} 失败`, error);
      // 不中断整体流程
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
   * 检查缓存是否存在且有效
   * @returns {boolean}
   */
  hasCacheValidCache() {
    const cached = localStorage.getItem(this.cacheKey);
    if (!cached) {
      return false;
    }

    try {
      const { timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // 检查是否过期
      if (age < Constants.CACHE_DURATION) {
        return true;
      } else {
        this.logger.info('缓存已过期');
        return false;
      }
    } catch (error) {
      this.logger.warn('缓存解析失败', error);
      return false;
    }
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
