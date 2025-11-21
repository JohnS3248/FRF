/**
 * 好友评测列表提取器 - 新架构核心模块
 * 负责提取好友的所有评测游戏 ID 列表
 */

class ReviewListExtractor {
  constructor() {
    this.logger = new Logger('ReviewListExtractor');
  }

  /**
   * 提取好友的所有评测游戏 ID
   * @param {string} steamId - 好友的 Steam ID
   * @returns {Promise<Array<string>>} 游戏 App ID 数组
   */
  async extractFriendReviewGames(steamId) {
    this.logger.debug(`开始提取好友 ${steamId} 的评测列表`);
    this.logger.time(`提取好友 ${steamId}`);

    try {
      // 1. 访问第一页
      const firstPageUrl = Constants.PROFILE_REVIEWS_URL(steamId, 1);
      const firstPageHtml = await this.fetchPage(firstPageUrl);

      // 2. 提取评测总数
      const totalReviews = this.extractTotalReviews(firstPageHtml);

      if (totalReviews === 0) {
        this.logger.debug(`好友 ${steamId} 没有评测`);
        this.logger.timeEnd(`提取好友 ${steamId}`);
        return [];
      }

      // 3. 计算总页数
      const totalPages = this.calculateTotalPages(totalReviews);
      this.logger.debug(`好友 ${steamId} 共 ${totalReviews} 篇评测，${totalPages} 页`);

      // 4. 提取第一页的游戏 ID
      const allAppIds = this.parseAppIds(firstPageHtml);

      // 5. 如果有多页，访问剩余页面
      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page++) {
          const url = Constants.PROFILE_REVIEWS_URL(steamId, page);
          const html = await this.fetchPage(url);
          const appIds = this.parseAppIds(html);
          allAppIds.push(...appIds);

          // 延迟避免限流
          await this.delay(Constants.PAGE_REQUEST_DELAY);
        }
      }

      // 6. 去重
      const uniqueAppIds = [...new Set(allAppIds)];

      this.logger.debug(`好友 ${steamId} 评测了 ${uniqueAppIds.length} 款游戏`);
      this.logger.timeEnd(`提取好友 ${steamId}`);

      return uniqueAppIds;

    } catch (error) {
      this.logger.error(`提取好友 ${steamId} 失败`, error);
      this.logger.timeEnd(`提取好友 ${steamId}`);
      return [];
    }
  }

  /**
   * 从 HTML 中提取评测总数
   * @param {string} html - 第一页的 HTML
   * @returns {number} 评测总数
   */
  extractTotalReviews(html) {
    const match = html.match(Constants.REGEX.TOTAL_REVIEWS);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  }

  /**
   * 计算总页数
   * @param {number} totalReviews - 评测总数
   * @returns {number} 总页数
   */
  calculateTotalPages(totalReviews) {
    return Math.ceil(totalReviews / Constants.REVIEWS_PER_PAGE);
  }

  /**
   * 从 HTML 中提取游戏 App ID
   * @param {string} html - 页面 HTML
   * @returns {Array<string>} App ID 数组
   */
  parseAppIds(html) {
    const matches = [...html.matchAll(Constants.REGEX.APP_ID)];
    const appIds = matches.map(m => m[1]);

    // 去重
    return [...new Set(appIds)];
  }

  /**
   * 获取页面内容
   * @param {string} url - 目标 URL
   * @returns {Promise<string>} HTML 内容
   */
  async fetchPage(url) {
    const fullUrl = url.startsWith('http') ? url : `${Constants.STEAM_COMMUNITY}${url}`;

    const response = await fetch(fullUrl, {
      credentials: 'include',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  }

  /**
   * 延迟工具函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

if (typeof window !== 'undefined') {
  window.FRF_ReviewListExtractor = ReviewListExtractor;
}
