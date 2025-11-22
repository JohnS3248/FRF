/**
 * 评测字典缓存管理器 - v5.0 精简版
 * 负责查询、持久化好友评测字典
 *
 * 缓存通过快速搜索自动构建，无需手动调用 buildCache
 */

class ReviewCache {
  constructor() {
    this.logger = new Logger('ReviewCache');

    // 字典结构：{ steamId: [appId1, appId2, ...] }
    this.friendReviewsMap = {};

    // 缓存键
    this.cacheKey = `${Constants.CACHE_KEY_PREFIX}review_dict_${Constants.CACHE_VERSION}`;
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
}

if (typeof window !== 'undefined') {
  window.FRF_ReviewCache = ReviewCache;
}
