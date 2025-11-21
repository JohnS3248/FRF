/**
 * Steam API 交互层 - 新架构
 * 负责所有与 Steam 服务器的通信
 */

class SteamAPI {
  constructor(appId) {
    this.appId = String(appId); // 确保 appId 为字符串
    this.logger = new Logger('SteamAPI');
    this.validator = new Validator();
    this.extractor = new ReviewExtractor();
  }

  /**
   * 检查域名
   */
  checkDomain() {
    if (!window.location.hostname.includes('steamcommunity.com')) {
      throw new Error('必须在 steamcommunity.com 域名下运行');
    }
  }

  /**
   * 获取好友列表
   * @returns {Promise<Array<string>>} Steam ID 数组
   */
  async getFriendsList() {
    this.checkDomain();
    this.logger.time('获取好友列表');
    this.logger.info('开始获取好友列表...');

    try {
      const response = await fetch(Constants.FRIENDS_LIST_URL, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const matches = [...html.matchAll(Constants.REGEX.STEAM_ID)];
      const friendIds = [...new Set(matches.map(m => m[1]))];

      this.logger.timeEnd('获取好友列表');
      this.logger.info(`成功获取 ${friendIds.length} 个好友`);

      return friendIds;

    } catch (error) {
      this.logger.error('获取好友列表失败', error);
      throw error;
    }
  }

  /**
   * 获取单个好友的评测详细数据
   * @param {string} steamId - 好友 Steam ID
   * @returns {Promise<Object|null>} 评测数据
   */
  async getFriendReview(steamId) {
    const url = Constants.PROFILE_GAME_REVIEW_URL(steamId, this.appId);
    const fullUrl = `${Constants.STEAM_COMMUNITY}${url}`;

    try {
      const response = await fetch(fullUrl, {
        credentials: 'include',
        redirect: 'follow'
      });

      if (!response.ok) {
        this.logger.debug(`好友 ${steamId} 请求失败: HTTP ${response.status}`);
        return null;
      }

      const html = await response.text();
      const finalUrl = response.url;

      // 三重验证
      const validation = this.validator.validateReviewPage(finalUrl, html, this.appId);

      if (!validation.valid) {
        this.logger.debug(`好友 ${steamId} 验证失败: ${validation.reason}`);
        return null;
      }

      // 提取数据
      const reviewData = this.extractor.extract(html, steamId, this.appId);
      this.logger.debug(`好友 ${steamId} 评测提取成功`);

      return reviewData;

    } catch (error) {
      this.logger.warn(`好友 ${steamId} 请求异常`, error);
      return null;
    }
  }

  /**
   * 批量获取好友评测（带进度回调）
   * @param {Array<string>} friendIds - 好友 Steam ID 列表
   * @param {Function} onProgress - 进度回调 (current, total, found)
   * @returns {Promise<Array<Object>>} 评测数据数组
   */
  async batchGetReviews(friendIds, onProgress = null) {
    this.logger.time('批量获取评测');
    this.logger.info(`开始获取 ${friendIds.length} 个好友的详细评测...`);

    const allReviews = [];
    let currentIndex = 0;

    for (let i = 0; i < friendIds.length; i += Constants.BATCH_SIZE) {
      const batch = friendIds.slice(i, Math.min(i + Constants.BATCH_SIZE, friendIds.length));

      // 并发请求
      const promises = batch.map(steamId => this.getFriendReview(steamId));
      const results = await Promise.all(promises);

      // 过滤 null
      const validReviews = results.filter(review => review !== null);
      allReviews.push(...validReviews);

      currentIndex += batch.length;

      // 进度回调
      if (onProgress) {
        onProgress(currentIndex, friendIds.length, allReviews.length);
      }

      this.logger.debug(`批次进度: ${currentIndex}/${friendIds.length}, 已找到 ${allReviews.length} 篇`);

      // 批次延迟
      if (currentIndex < friendIds.length) {
        await this.delay(Constants.REQUEST_DELAY);
      }
    }

    this.logger.timeEnd('批量获取评测');
    this.logger.info(`完成！共获取 ${allReviews.length} 篇评测`);

    return allReviews;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

if (typeof window !== 'undefined') {
  window.FRF_SteamAPI = SteamAPI;
}
