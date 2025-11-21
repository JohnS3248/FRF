
/**
 * FRF v2.0 - 开发测试版本
 * 全新字典缓存架构
 *
 * 使用方法：
 * 1. 访问 https://steamcommunity.com/
 * 2. 打开浏览器控制台（F12）
 * 3. 复制粘贴此文件全部内容并回车
 * 4. 运行 FRF.test(appId) 开始测试
 *
 * 快速命令：
 * - FRF.test(413150)   测试星露谷物语
 * - FRF.help()         查看帮助
 * - FRF.stats()        查看缓存统计
 */

(function() {
  'use strict';


// ==================== src/utils/constants.js ====================

/**
 * 常量定义 - 新架构
 * 集中管理所有配置参数和魔法数字
 */

const Constants = {
  // ==================== 版本信息 ====================
  VERSION: '1.0.0',
  CACHE_VERSION: 'v2', // 新架构缓存版本

  // ==================== 请求配置 ====================
  BATCH_SIZE: 5,                    // 并发批处理大小
  REQUEST_DELAY: 500,               // 每批请求延迟（毫秒）
  PAGE_REQUEST_DELAY: 200,          // 翻页请求延迟（毫秒）
  REQUEST_TIMEOUT: 10000,           // 单个请求超时（毫秒）

  // ==================== 缓存配置 ====================
  CACHE_DURATION: 7 * 24 * 3600000, // 缓存有效期：7天
  CACHE_KEY_PREFIX: 'frf_cache_',   // 缓存键前缀

  // ==================== Steam URL 模板 ====================
  STEAM_COMMUNITY: 'https://steamcommunity.com',
  FRIENDS_LIST_URL: '/my/friends/',

  // 好友评测列表页（支持翻页）
  PROFILE_REVIEWS_URL: (steamId, page = 1) => {
    const base = steamId.match(/^\d+$/)
      ? `/profiles/${steamId}/recommended/`
      : `/id/${steamId}/recommended/`;
    return page > 1 ? `${base}?p=${page}` : base;
  },

  // 单个游戏评测页
  PROFILE_GAME_REVIEW_URL: (steamId, appId) => {
    const base = steamId.match(/^\d+$/)
      ? `/profiles/${steamId}/recommended/${appId}/`
      : `/id/${steamId}/recommended/${appId}/`;
    return base;
  },

  // ==================== 分页配置 ====================
  REVIEWS_PER_PAGE: 10,             // 每页评测数量（Steam 固定）

  // ==================== 正则表达式 ====================
  REGEX: {
    // Steam ID 提取
    STEAM_ID: /data-steamid="(\d+)"/g,

    // 游戏 App ID 提取
    APP_ID: /app\/(\d+)/g,

    // 评测总数提取
    TOTAL_REVIEWS: /<div class="giantNumber[^"]*">(\d+)<\/div>/,

    // 分页链接提取
    PAGE_LINKS: /<a class="pagelink" href="\?p=(\d+)">/g,

    // 游戏时长
    TOTAL_HOURS: [
      /总时数\s*([\d,]+(?:\.\d+)?)\s*小时/,
      /([\d,]+(?:\.\d+)?)\s*hrs?\s+on\s+record/i
    ],

    // 发布时间
    PUBLISH_DATE: [
      /发布于[：:]\s*([^<\r\n]+)/,
      /Posted[：:]\s*([^<\r\n]+)/i
    ],

    // 更新时间（带年份）
    UPDATE_DATE_WITH_YEAR: [
      /更新于[：:]\s*(\d{4}\s*年[^<\r\n]+)/,
      /Updated[：:]\s*([A-Za-z]+\s+\d+,\s*\d{4}[^<\r\n]+)/i
    ],

    // 更新时间（不带年份）
    UPDATE_DATE_WITHOUT_YEAR: [
      /更新于[：:]\s*(\d{1,2}\s*月\s*\d{1,2}\s*日[^<\r\n]*?)(?:<|$)/,
      /Updated[：:]\s*([A-Za-z]+\s+\d{1,2}[^<\r\n]*?)(?:<|$)/i
    ]
  },

  // ==================== 验证关键词 ====================
  VALIDATION: {
    RATING_SUMMARY: 'ratingSummary',
    RECOMMENDATION_KEYWORDS: ['推荐', '不推荐', 'Recommended', 'Not Recommended'],
    POSITIVE_INDICATORS: [
      'icon_thumbsUp.png',
      'ratingSummary">推荐',
      'ratingSummary">Recommended'
    ]
  },

  // ==================== 调试配置 ====================
  DEBUG_MODE: false,
  LOG_LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  }
};

// 暴露到全局
if (typeof window !== 'undefined') {
  window.FRF_Constants = Constants;
}


// ==================== src/utils/logger.js ====================

/**
 * 日志系统 - 新架构
 * 支持分级日志、性能追踪、彩色输出
 */

class Logger {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.logLevel = Constants.DEBUG_MODE ? Constants.LOG_LEVELS.DEBUG : Constants.LOG_LEVELS.INFO;

    // 彩色输出配置
    this.colors = {
      DEBUG: '#999',
      INFO: '#47bfff',
      WARN: '#ff9800',
      ERROR: '#f44336'
    };
  }

  setLevel(level) {
    this.logLevel = Constants.LOG_LEVELS[level] || Constants.LOG_LEVELS.INFO;
  }

  shouldLog(level) {
    return Constants.LOG_LEVELS[level] <= this.logLevel;
  }

  formatPrefix(level) {
    return `[FRF:${this.moduleName}][${level}]`;
  }

  /**
   * 彩色日志输出
   */
  colorLog(level, message, data = null) {
    const color = this.colors[level] || '#999';
    const prefix = this.formatPrefix(level);

    if (data) {
      console.log(`%c${prefix}`, `color: ${color}; font-weight: bold;`, message, data);
    } else {
      console.log(`%c${prefix}`, `color: ${color}; font-weight: bold;`, message);
    }
  }

  debug(message, data = null) {
    if (!this.shouldLog('DEBUG')) return;
    this.colorLog('DEBUG', message, data);
  }

  info(message, data = null) {
    if (!this.shouldLog('INFO')) return;
    this.colorLog('INFO', message, data);
  }

  warn(message, data = null) {
    if (!this.shouldLog('WARN')) return;
    this.colorLog('WARN', message, data);
  }

  error(message, error = null) {
    if (!this.shouldLog('ERROR')) return;
    this.colorLog('ERROR', message, error);
  }

  /**
   * 性能追踪
   */
  time(label) {
    console.time(`${this.formatPrefix('PERF')} ${label}`);
  }

  timeEnd(label) {
    console.timeEnd(`${this.formatPrefix('PERF')} ${label}`);
  }

  /**
   * 表格输出
   */
  table(data) {
    if (!this.shouldLog('DEBUG')) return;
    console.log(this.formatPrefix('DEBUG'), '数据表格：');
    console.table(data);
  }

  /**
   * 进度输出
   */
  progress(current, total, message = '') {
    const percent = ((current / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
    this.info(`${message} [${bar}] ${percent}% (${current}/${total})`);
  }
}

if (typeof window !== 'undefined') {
  window.FRF_Logger = Logger;
}


// ==================== src/utils/validator.js ====================

/**
 * 数据验证器 - 新架构
 * 验证从 Steam 提取的数据有效性
 */

class Validator {
  constructor() {
    this.logger = new Logger('Validator');
  }

  isValidSteamId(steamId) {
    return /^\d{17}$/.test(steamId);
  }

  isValidAppId(appId) {
    return /^\d+$/.test(String(appId));
  }

  isCorrectReviewUrl(url, appId) {
    const hasRecommendedPath = url.includes('/recommended/');
    const hasCorrectAppId = url.includes(`/${appId}/`) || url.includes(`/${appId}`);

    if (!hasRecommendedPath || !hasCorrectAppId) {
      this.logger.debug('URL 验证失败', { url, appId });
      return false;
    }
    return true;
  }

  hasReviewContent(html) {
    const hasRatingSummary = html.includes(Constants.VALIDATION.RATING_SUMMARY);
    const hasRecommendation = Constants.VALIDATION.RECOMMENDATION_KEYWORDS.some(
      keyword => html.includes(keyword)
    );

    if (!hasRatingSummary || !hasRecommendation) {
      this.logger.debug('评测内容验证失败');
      return false;
    }
    return true;
  }

  isCorrectGame(html, appId) {
    const hasAppId = html.includes(`app/${appId}`) ||
                     html.includes(`appid=${appId}`) ||
                     html.includes(`"appid":${appId}`);

    if (!hasAppId) {
      this.logger.debug('游戏验证失败', { appId });
      return false;
    }
    return true;
  }

  /**
   * 三重验证
   */
  validateReviewPage(finalUrl, html, appId) {
    if (!this.isCorrectReviewUrl(finalUrl, appId)) {
      return { valid: false, reason: 'URL重定向' };
    }

    if (!this.hasReviewContent(html)) {
      return { valid: false, reason: '无评测内容' };
    }

    if (!this.isCorrectGame(html, appId)) {
      return { valid: false, reason: '游戏不匹配' };
    }

    return { valid: true, reason: '验证通过' };
  }
}

if (typeof window !== 'undefined') {
  window.FRF_Validator = Validator;
}


// ==================== src/core/ReviewExtractor.js ====================

/**
 * 评测数据提取器
 * 从单个评测页面提取详细信息
 */

class ReviewExtractor {
  constructor() {
    this.logger = new Logger('ReviewExtractor');
  }

  /**
   * 提取完整的评测数据
   * @param {string} html - 评测页面 HTML
   * @param {string} steamId - 好友 Steam ID
   * @param {string} appId - 游戏 App ID
   * @returns {Object} 评测数据对象
   */
  extract(html, steamId, appId) {
    const reviewData = {
      steamId,
      appId,
      url: Constants.PROFILE_GAME_REVIEW_URL(steamId, appId),
      isPositive: this.extractRecommendation(html),
      totalHours: this.extractTotalHours(html),
      publishDate: this.extractPublishDate(html),
      updateDate: this.extractUpdateDate(html)
    };

    this.logger.debug('提取评测数据', reviewData);
    return reviewData;
  }

  extractRecommendation(html) {
    return Constants.VALIDATION.POSITIVE_INDICATORS.some(
      indicator => html.includes(indicator)
    );
  }

  extractTotalHours(html) {
    for (const pattern of Constants.REGEX.TOTAL_HOURS) {
      const match = html.match(pattern);
      if (match) {
        return match[1].replace(/,/g, '');
      }
    }
    this.logger.warn('未能提取游戏时长');
    return '未知';
  }

  extractPublishDate(html) {
    for (const pattern of Constants.REGEX.PUBLISH_DATE) {
      const match = html.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    this.logger.warn('未能提取发布时间');
    return '未知';
  }

  extractUpdateDate(html) {
    // 优先匹配带年份
    for (const pattern of Constants.REGEX.UPDATE_DATE_WITH_YEAR) {
      const match = html.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // 不带年份
    for (const pattern of Constants.REGEX.UPDATE_DATE_WITHOUT_YEAR) {
      const match = html.match(pattern);
      if (match) {
        const currentYear = new Date().getFullYear();
        return `${match[1].trim()} (${currentYear})`;
      }
    }

    return null;
  }
}

if (typeof window !== 'undefined') {
  window.FRF_ReviewExtractor = ReviewExtractor;
}


// ==================== src/core/ReviewListExtractor.js ====================

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


// ==================== src/core/SmartThrottler.js ====================

/**
 * 固定延迟限流器 - v2.0 正式版
 *
 * 经过多轮测试验证的最优配置：
 * - BATCH_SIZE = 3, DELAY = 300ms
 * - 固定参数，不做自适应调整
 * - 接受个别慢响应（数据量大导致，无法避免）
 */

class Throttler {
  constructor() {
    // 最优配置（经实测验证）
    this.batchSize = 3;           // 每批处理 3 个好友
    this.delay = 300;             // 批次间延迟 300ms

    this.logger = new Logger('Throttler');
  }

  /**
   * 获取批次大小
   * @returns {number} 批次大小
   */
  getBatchSize() {
    return this.batchSize;
  }

  /**
   * 获取延迟时间
   * @returns {number} 延迟时间（毫秒）
   */
  getDelay() {
    return this.delay;
  }
}

// 暴露到全局
if (typeof window !== 'undefined') {
  window.FRF_Throttler = Throttler;
}


// ==================== src/core/ReviewCache.js ====================

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


// ==================== src/core/SteamAPI.js ====================

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


// ==================== src/main.js ====================

/**
 * FRF - Friend Review Finder
 * 主程序 - 新架构
 *
 * 使用字典缓存优化的查询流程
 */

class FriendReviewFinder {
  constructor(appId) {
    this.appId = String(appId); // 确保 appId 为字符串
    this.logger = new Logger('Main');
    this.cache = new ReviewCache();
    this.steamAPI = new SteamAPI(this.appId);

    this.reviews = [];
    this.friends = [];
  }

  /**
   * 核心方法：获取好友评测（优化版）
   * @returns {Promise<Array>} 评测数据数组
   */
  async fetchReviews() {
    this.logger.info('========================================');
    this.logger.info('  FRF - Friend Review Finder v2.0');
    this.logger.info('  使用字典缓存优化架构');
    this.logger.info('========================================');

    try {
      // ========== 阶段 1：获取/加载字典 ==========
      let cacheLoaded = this.cache.loadFromCache();

      if (!cacheLoaded) {
        this.logger.info('');
        this.logger.info('🔄 首次使用，正在构建评测字典...');
        this.logger.info('   （此过程需要 1-3 分钟，但只需执行一次）');
        this.logger.info('');

        // 获取好友列表
        this.friends = await this.steamAPI.getFriendsList();

        // 构建字典
        await this.cache.buildCache(this.friends, (current, total, built) => {
          if (current % 10 === 0 || current === total) {
            this.logger.progress(current, total, `构建字典`);
          }
        });

        this.logger.info('');
        this.logger.info('✅ 字典构建完成！已缓存，下次使用将秒速启动');
        this.logger.info('');

      } else {
        this.logger.info('✅ 从缓存加载字典（瞬间完成）');

        // 显示缓存统计
        const stats = this.cache.getCacheStats();
        this.logger.info(`   📊 缓存信息: ${stats.friendsWithReviews} 个好友, ${stats.totalReviews} 篇评测, ${stats.cacheAge} 小时前更新`);
        this.logger.info('');
      }

      // ========== 阶段 2：快速查询 ==========
      this.logger.info(`🔍 正在查询游戏 ${this.appId} 的好友评测...`);

      const matchedFriends = this.cache.findFriendsWithReview(this.appId);

      if (matchedFriends.length === 0) {
        this.logger.info('😢 没有好友评测过这款游戏');
        this.logger.info('');
        return [];
      }

      this.logger.info(`🎯 找到 ${matchedFriends.length} 个好友评测了这款游戏`);
      this.logger.info('');

      // ========== 阶段 3：获取详细数据 ==========
      this.logger.info('📥 正在获取详细评测数据...');

      this.reviews = await this.steamAPI.batchGetReviews(matchedFriends, (current, total, found) => {
        if (current % 5 === 0 || current === total) {
          this.logger.progress(current, total, `详细数据`);
        }
      });

      // ========== 阶段 4：输出结果 ==========
      this.logger.info('');
      this.logger.info('========================================');
      this.logger.info('  ✅ 查询完成！');
      this.logger.info('========================================');

      this.showResults();

      // 保存到全局
      window.frfReviews = this.reviews;
      this.logger.info('💾 评测数据已保存到 window.frfReviews');
      this.logger.info('');

      return this.reviews;

    } catch (error) {
      this.logger.error('获取评测失败', error);
      throw error;
    }
  }

  /**
   * 刷新字典缓存
   */
  async refreshCache() {
    this.logger.info('🔄 开始刷新评测字典...');

    const friends = await this.steamAPI.getFriendsList();
    await this.cache.buildCache(friends, (current, total) => {
      if (current % 10 === 0 || current === total) {
        this.logger.progress(current, total, '刷新字典');
      }
    });

    this.logger.info('✅ 字典已刷新');
  }

  /**
   * 显示结果统计
   */
  showResults() {
    const positive = this.reviews.filter(r => r.isPositive).length;
    const negative = this.reviews.length - positive;

    this.logger.info(`📊 找到 ${this.reviews.length} 篇评测`);
    this.logger.info(`   👍 推荐: ${positive} 篇`);
    this.logger.info(`   👎 不推荐: ${negative} 篇`);
    this.logger.info('');

    // 显示详细列表
    if (this.reviews.length > 0) {
      this.logger.info('📋 评测列表:');
      this.logger.table(this.reviews.map((r, i) => ({
        '#': i + 1,
        '推荐': r.isPositive ? '👍' : '👎',
        '时长': `${r.totalHours}h`,
        '发布': r.publishDate,
        '更新': r.updateDate || '-',
        'Steam ID': r.steamId
      })));
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      appId: this.appId,
      totalReviews: this.reviews.length,
      positive: this.reviews.filter(r => r.isPositive).length,
      negative: this.reviews.filter(r => !r.isPositive).length,
      cacheStats: this.cache.getCacheStats()
    };
  }
}

// ==================== 全局暴露 ====================
if (typeof window !== 'undefined') {
  window.FRF_FriendReviewFinder = FriendReviewFinder;

  // 全局辅助对象
  window.FRF = {
    /**
     * 快速测试
     */
    test: async function(appId) {
      console.log(`%c========================================`, 'color: #47bfff; font-weight: bold;');
      console.log(`%c  🎮 测试游戏 App ID: ${appId}`, 'color: #47bfff; font-weight: bold; font-size: 14px;');
      console.log(`%c========================================`, 'color: #47bfff; font-weight: bold;');
      console.log('');

      const finder = new FriendReviewFinder(appId);
      await finder.fetchReviews();
      return finder;
    },

    /**
     * 获取当前页面的 App ID
     */
    getAppId: function() {
      const match = window.location.pathname.match(/\/app\/(\d+)/);
      if (match) {
        console.log(`✅ 当前页面 App ID: ${match[1]}`);
        return match[1];
      } else {
        console.warn('❌ 未检测到 App ID');
        return null;
      }
    },

    /**
     * 刷新缓存
     */
    refresh: async function() {
      console.log('🔄 开始刷新缓存...');
      const cache = new ReviewCache();
      const steamAPI = new SteamAPI('0');
      const friends = await steamAPI.getFriendsList();
      await cache.buildCache(friends);
      console.log('✅ 缓存刷新完成');
    },

    /**
     * 清除缓存
     */
    clearCache: function() {
      const cache = new ReviewCache();
      cache.clearCache();
      console.log('✅ 缓存已清除');
    },

    /**
     * 查看缓存统计
     */
    stats: function() {
      const cache = new ReviewCache();
      if (cache.loadFromCache()) {
        const stats = cache.getCacheStats();
        console.log('📊 缓存统计:');
        console.table(stats);
      } else {
        console.log('❌ 无缓存数据');
      }
    },

    /**
     * 切换调试模式
     */
    setDebug: function(enabled) {
      Constants.DEBUG_MODE = enabled;
      console.log(`${enabled ? '✅' : '❌'} 调试模式已${enabled ? '开启' : '关闭'}`);
    },

    /**
     * 显示帮助
     */
    help: function() {
      console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
      console.log('%c  📖 FRF 使用指南', 'color: #47bfff; font-weight: bold; font-size: 16px;');
      console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
      console.log('');
      console.log('🎯 基本命令:');
      console.log('  FRF.test(appId)      - 测试指定游戏');
      console.log('  FRF.getAppId()       - 获取当前页面游戏ID');
      console.log('');
      console.log('🔧 缓存管理:');
      console.log('  FRF.refresh()        - 刷新缓存');
      console.log('  FRF.clearCache()     - 清除缓存');
      console.log('  FRF.stats()          - 查看缓存统计');
      console.log('');
      console.log('⚙️ 高级选项:');
      console.log('  FRF.setDebug(true)   - 开启调试模式');
      console.log('  FRF.help()           - 显示此帮助');
      console.log('');
      console.log('💡 示例:');
      console.log('  FRF.test(413150)     - 测试《星露谷物语》');
      console.log('');
    }
  };

  // 欢迎信息
  console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
  console.log('%c  🚀 FRF v2.0 已加载', 'color: #47bfff; font-weight: bold; font-size: 16px;');
  console.log('%c  Friend Review Finder', 'color: #47bfff;');
  console.log('%c  全新字典缓存架构', 'color: #4caf50; font-weight: bold;');
  console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
  console.log('');
  console.log('📖 输入 %cFRF.help()%c 查看使用说明', 'color: #ff9800; font-weight: bold;', '');
  console.log('🎯 快速开始: %cFRF.test(appId)%c', 'color: #ff9800; font-weight: bold;', '');
  console.log('');
}



})();
