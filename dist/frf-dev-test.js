
/**
 * FRF v3.1 - 开发测试版本
 * 双模式架构 + UI自动修复
 *
 * 使用方法：
 * 1. 访问 Steam 好友评测页面（如 steamcommunity.com/app/413150/reviews/?browsefilter=createdbyfriends）
 * 2. 打开浏览器控制台（F12）
 * 3. 复制粘贴此文件全部内容并回车
 * 4. FRF会自动检测并修复Steam渲染bug
 *
 * UI渲染（v3.1 新增）：
 * - FRF.renderUI()     渲染好友评测到页面
 * - FRF.renderUI(true) 强制刷新重新获取
 *
 * 快速模式：
 * - FRF.quick(413150)  快速搜索星露谷物语
 * - FRF.pause()        暂停搜索
 * - FRF.resume()       继续搜索
 *
 * 字典模式：
 * - FRF.test(413150)   字典模式查询
 * - FRF.stats()        查看缓存统计
 * - FRF.help()         查看帮助
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
 * 从单个评测页面提取详细信息（包含用户信息和评测内容）
 */

class ReviewExtractor {
  constructor() {
    this.logger = new Logger('ReviewExtractor');
  }

  /**
   * 提取完整的评测数据（基础版，兼容旧代码）
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

  /**
   * 提取完整的评测数据（UI渲染版，包含用户信息和评测内容）
   * @param {string} html - 评测页面 HTML
   * @param {string} steamId - 好友 Steam ID
   * @param {string} appId - 游戏 App ID
   * @returns {Object} 完整评测数据对象
   */
  extractFull(html, steamId, appId) {
    const reviewData = {
      // 基础信息
      steamId,
      appId,
      url: Constants.PROFILE_GAME_REVIEW_URL(steamId, appId),

      // 评测信息
      isPositive: this.extractRecommendation(html),
      totalHours: this.extractTotalHours(html),
      publishDate: this.extractPublishDate(html),
      updateDate: this.extractUpdateDate(html),

      // 用户信息（新增）
      userAvatar: this.extractUserAvatar(html),
      userName: this.extractUserName(html),
      userProfileUrl: this.extractUserProfileUrl(html, steamId),

      // 评测内容（新增）
      reviewContent: this.extractReviewContent(html),
      helpfulCount: this.extractHelpfulCount(html),
      funnyCount: this.extractFunnyCount(html)
    };

    this.logger.debug('提取完整评测数据', {
      steamId,
      userName: reviewData.userName,
      isPositive: reviewData.isPositive,
      contentLength: reviewData.reviewContent?.length || 0
    });

    return reviewData;
  }

  // ==================== 用户信息提取 ====================

  /**
   * 提取用户头像URL
   */
  extractUserAvatar(html) {
    // 从 profile_small_header_avatar 区域提取头像
    // <img src="https://avatars.fastly.steamstatic.com/xxx_medium.jpg">
    const patterns = [
      /profile_small_header_avatar[\s\S]*?<img[^>]*src="([^"]+_medium\.jpg)"/,
      /profile_small_header_avatar[\s\S]*?<img[^>]*src="([^"]+\.jpg)"/,
      /playerAvatar[^>]*>[\s\S]*?<img[^>]*src="([^"]+_medium\.jpg)"/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1];
      }
    }

    this.logger.warn('未能提取用户头像');
    return null;
  }

  /**
   * 提取用户名称
   */
  extractUserName(html) {
    // 从 persona_name_text_content 提取用户名
    // <a class="whiteLink persona_name_text_content" href="...">用户名</a>
    const patterns = [
      /profile_small_header_name[\s\S]*?persona_name_text_content[^>]*>[\s\n]*([^<]+)/,
      /persona_name_text_content[^>]*>[\s\n]*([^<]+)/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    this.logger.warn('未能提取用户名');
    return '未知用户';
  }

  /**
   * 提取用户主页URL
   */
  extractUserProfileUrl(html, steamId) {
    // 尝试从页面提取，如果失败则使用steamId构造
    const match = html.match(/href="(https:\/\/steamcommunity\.com\/(?:profiles|id)\/[^"]+)"/);
    if (match) {
      // 提取基础URL（去掉后面的recommended等路径）
      const url = match[1];
      const baseMatch = url.match(/(https:\/\/steamcommunity\.com\/(?:profiles|id)\/[^\/]+)/);
      if (baseMatch) {
        return baseMatch[1];
      }
    }

    // 回退：使用steamId构造
    return `https://steamcommunity.com/profiles/${steamId}`;
  }

  // ==================== 评测内容提取 ====================

  /**
   * 提取评测正文内容
   */
  extractReviewContent(html) {
    // 从 #ReviewText 提取评测内容
    // <div id="ReviewText">评测内容...</div>
    const match = html.match(/<div id="ReviewText">([\s\S]*?)<\/div>\s*(?:<div id="ReviewEdit"|<div class="review_rate_bar")/);

    if (match) {
      let content = match[1];

      // 清理HTML，但保留基本格式
      content = this.cleanReviewContent(content);

      return content;
    }

    this.logger.warn('未能提取评测内容');
    return '';
  }

  /**
   * 清理评测内容HTML
   */
  cleanReviewContent(html) {
    // 保留的标签：br, b, i, u, a, div (用于标题)
    // 移除危险标签和属性

    let content = html;

    // 移除script和style标签
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[\s\S]*?<\/style>/gi, '');

    // 移除onclick等事件属性
    content = content.replace(/\s+on\w+="[^"]*"/gi, '');

    // 保留链接但移除target和rel属性
    content = content.replace(/(<a[^>]*)\s+target="[^"]*"/gi, '$1');
    content = content.replace(/(<a[^>]*)\s+rel="[^"]*"/gi, '$1');
    content = content.replace(/(<a[^>]*)\s+id="[^"]*"/gi, '$1');

    // 处理BB code样式的标题
    content = content.replace(/<div class="bb_h1">([^<]*)<\/div>/gi, '<b>$1</b><br>');
    content = content.replace(/<div class="bb_h2">([^<]*)<\/div>/gi, '<b>$1</b><br>');

    // 处理引用块
    content = content.replace(/<blockquote class="bb_blockquote">([\s\S]*?)<\/blockquote>/gi, '<i>"$1"</i>');

    // 清理多余空白
    content = content.trim();

    return content;
  }

  /**
   * 提取"有价值"人数
   */
  extractHelpfulCount(html) {
    // 有 46 人觉得这篇评测有价值
    const patterns = [
      /有\s*(\d+)\s*人觉得这篇评测有价值/,
      /(\d+)\s*people found this review helpful/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
  }

  /**
   * 提取"欢乐"人数
   */
  extractFunnyCount(html) {
    // 有 1 人觉得这篇评测很欢乐
    const patterns = [
      /有\s*(\d+)\s*人觉得这篇评测很欢乐/,
      /(\d+)\s*people found this review funny/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
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
   * 暂停构建
   */
  pauseBuild() {
    if (this.isBuilding && !this.isPaused) {
      this.isPaused = true;
      this.logger.info('⏸️ 正在暂停...');
    }
  }

  /**
   * 继续构建
   */
  async resumeBuild() {
    // 尝试从保存的进度恢复
    const savedProgress = this.loadBuildProgress();
    if (savedProgress) {
      this.friendIds = savedProgress.friendIds;
      this.currentIndex = savedProgress.currentIndex;
      this.friendReviewsMap = savedProgress.data;
      this.startTime = Date.now() - (savedProgress.elapsed || 0);
    }

    if (this.currentIndex < this.friendIds.length) {
      this.isPaused = false;
      this.isBuilding = true;
      this.logger.info(`▶️ 继续构建 (${this.currentIndex}/${this.friendIds.length})...`);

      await this.processFriends();
    } else {
      this.logger.info('❌ 没有可继续的构建任务');
    }
  }

  /**
   * 保存构建进度
   */
  saveBuildProgress() {
    try {
      const progress = {
        friendIds: this.friendIds,
        currentIndex: this.currentIndex,
        data: this.friendReviewsMap,
        elapsed: Date.now() - this.startTime,
        timestamp: Date.now()
      };
      localStorage.setItem(this.progressKey, JSON.stringify(progress));
      this.logger.debug('进度已保存');
    } catch (error) {
      this.logger.warn('保存进度失败', error);
    }
  }

  /**
   * 加载构建进度
   */
  loadBuildProgress() {
    try {
      const saved = localStorage.getItem(this.progressKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      this.logger.warn('加载进度失败', error);
    }
    return null;
  }

  /**
   * 清除构建进度
   */
  clearBuildProgress() {
    localStorage.removeItem(this.progressKey);
  }

  /**
   * 获取构建状态
   */
  getBuildStatus() {
    return {
      isBuilding: this.isBuilding,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalFriends: this.friendIds.length,
      collectedFriends: Object.keys(this.friendReviewsMap).length,
      progress: this.friendIds.length > 0
        ? ((this.currentIndex / this.friendIds.length) * 100).toFixed(1)
        : 0
    };
  }

  /**
   * 格式化时间
   */
  formatTime(ms) {
    if (ms < 1000) return '< 1 秒';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} 秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} 分 ${remainingSeconds} 秒`;
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


// ==================== src/core/QuickSearcher.js ====================

/**
 * 快速搜索器 - v3.0 快速模式核心模块
 *
 * 算法逻辑：
 * 1. 获取好友列表
 * 2. 遍历每个好友，请求 /profiles/{steamId}/recommended/{appId}/
 * 3. 检查最终 URL 判断是否有评测
 *    - URL 包含 appId = 有评测 → 提取数据
 *    - URL 被重定向 = 没评测 → 返回 null
 * 4. 收集所有有效评测
 *
 * 优化参数（基于实测）：
 * - batchSize=30：最优并发数
 * - delay=0：无延迟最快
 * - 229 好友约 42 秒完成
 */

class QuickSearcher {
  constructor(appId) {
    this.appId = String(appId);
    this.logger = new Logger('QuickSearcher');
    this.extractor = new ReviewExtractor();

    // 配置参数（已优化：基于实测数据）
    this.batchSize = 30;        // 每批并发数（测试最优值）
    this.delay = 0;             // 批次间延迟（ms）（无延迟最快）
    this.debugMode = false;     // 调试模式

    // 状态
    this.isPaused = false;
    this.isRunning = false;
    this.reviews = [];
    this.friendIds = [];
    this.currentIndex = 0;
    this.startTime = 0;

    // 回调
    this.onProgress = null;
    this.onComplete = null;
    this.onPause = null;
  }

  /**
   * 开始快速搜索
   * @param {Object} options - 配置选项
   * @param {Function} options.onProgress - 进度回调 (current, total, found, eta)
   * @param {Function} options.onComplete - 完成回调 (reviews)
   * @param {Function} options.onPause - 暂停回调 (current, total)
   * @returns {Promise<Array>} 评测数据数组
   */
  async search(options = {}) {
    this.onProgress = options.onProgress || null;
    this.onComplete = options.onComplete || null;
    this.onPause = options.onPause || null;

    this.logger.info('========================================');
    this.logger.info('  🚀 快速模式 - 单游戏搜索');
    this.logger.info(`  🎮 目标游戏: ${this.appId}`);
    this.logger.info('========================================');
    this.logger.info('');

    try {
      // 1. 获取好友列表
      this.logger.info('📋 正在获取好友列表...');
      this.friendIds = await this.fetchFriendIds();
      this.logger.info(`✅ 获取到 ${this.friendIds.length} 个好友`);
      this.logger.info('');

      // 2. 开始搜索
      this.logger.info(`🔍 开始搜索好友评测...`);
      this.logger.info(`⚙️ 配置: 批次=${this.batchSize}, 延迟=${this.delay}ms`);
      this.logger.info('');

      this.isRunning = true;
      this.isPaused = false;
      this.startTime = Date.now();
      this.reviews = [];
      this.currentIndex = 0;

      await this.processAllFriends();

      // 3. 输出结果
      this.logger.info('');
      this.logger.info('========================================');
      this.logger.info('  ✅ 搜索完成！');
      this.logger.info('========================================');
      this.showResults();

      if (this.onComplete) {
        this.onComplete(this.reviews);
      }

      return this.reviews;

    } catch (error) {
      this.logger.error('搜索失败', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 获取好友列表
   */
  async fetchFriendIds() {
    const response = await fetch('/my/friends/', { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`获取好友列表失败: HTTP ${response.status}`);
    }

    const html = await response.text();
    const regex = /data-steamid="(\d+)"/g;
    const matches = [...html.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))];
  }

  /**
   * 处理所有好友
   */
  async processAllFriends() {
    const total = this.friendIds.length;

    while (this.currentIndex < total) {
      // 检查是否暂停
      if (this.isPaused) {
        this.logger.info(`⏸️ 已暂停 (${this.currentIndex}/${total})`);
        if (this.onPause) {
          this.onPause(this.currentIndex, total);
        }
        return;
      }

      // 获取当前批次
      const batch = this.friendIds.slice(
        this.currentIndex,
        Math.min(this.currentIndex + this.batchSize, total)
      );

      // 并发处理当前批次
      const promises = batch.map(steamId => this.checkFriendReview(steamId));
      const results = await Promise.all(promises);

      // 收集有效结果
      const validReviews = results.filter(r => r !== null);
      this.reviews.push(...validReviews);

      // 更新进度
      this.currentIndex += batch.length;

      // 计算 ETA
      const elapsed = Date.now() - this.startTime;
      const avgPerFriend = elapsed / this.currentIndex;
      const remaining = (total - this.currentIndex) * avgPerFriend;
      const eta = this.formatTime(remaining);

      // 进度回调
      if (this.onProgress) {
        this.onProgress(this.currentIndex, total, this.reviews.length, eta);
      }

      // 每 9 个好友显示一次进度
      if (this.currentIndex % 9 === 0 || this.currentIndex === total) {
        this.logger.info(
          `📊 进度: ${this.currentIndex}/${total}, ` +
          `已找到: ${this.reviews.length} 篇, ` +
          `预计剩余: ${eta}`
        );
      }

      // 批次延迟
      if (this.currentIndex < total && !this.isPaused) {
        await this.sleep(this.delay);
      }
    }
  }

  /**
   * 检查单个好友是否有目标游戏的评测
   * 通过 URL 重定向检测：有评测则停留在原 URL，无评测则重定向到 /recommended/
   *
   * @param {string} steamId - 好友 Steam ID
   * @param {boolean} returnRaw - 是否返回原始数据（包含HTML）
   * @returns {Promise<Object|null>} 评测数据或 null
   */
  async checkFriendReview(steamId, returnRaw = false) {
    const url = `https://steamcommunity.com/profiles/${steamId}/recommended/${this.appId}/`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        credentials: 'include',
        redirect: 'follow'
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        if (this.debugMode) {
          console.log(`[DEBUG] ${steamId} | not ok | ${elapsed}ms`);
        }
        return null;
      }

      // 检查最终 URL 是否包含 appId（未被重定向 = 有评测）
      const finalUrl = response.url;
      const hasReview = finalUrl.includes(`/recommended/${this.appId}`);

      if (this.debugMode) {
        console.log(`[DEBUG] ${steamId} | hasReview=${hasReview} | ${elapsed}ms`);
      }

      if (!hasReview) {
        return null;
      }

      // 有评测，提取数据
      const html = await response.text();

      // 如果需要原始数据（用于UI渲染），返回包含HTML的对象
      if (returnRaw) {
        return {
          hasReview: true,
          html: html,
          steamId: steamId
        };
      }

      return this.extractReviewData(html, steamId);

    } catch (error) {
      if (this.debugMode) {
        console.log(`[DEBUG] ${steamId} | error: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * 从 HTML 提取评测数据
   */
  extractReviewData(html, steamId) {
    return {
      steamId,
      appId: this.appId,
      url: `https://steamcommunity.com/profiles/${steamId}/recommended/${this.appId}/`,
      isPositive: this.extractRecommendation(html),
      totalHours: this.extractTotalHours(html),
      publishDate: this.extractPublishDate(html),
      updateDate: this.extractUpdateDate(html)
    };
  }

  /**
   * 提取推荐状态
   */
  extractRecommendation(html) {
    const positiveIndicators = [
      'icon_thumbsUp.png',
      'ratingSummary">推荐',
      'ratingSummary">Recommended'
    ];
    return positiveIndicators.some(indicator => html.includes(indicator));
  }

  /**
   * 提取游戏时长
   */
  extractTotalHours(html) {
    const patterns = [
      /总时数\s*([\d,]+(?:\.\d+)?)\s*小时/,
      /([\d,]+(?:\.\d+)?)\s*hrs?\s+on\s+record/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1].replace(/,/g, '');
      }
    }
    return '未知';
  }

  /**
   * 提取发布时间
   */
  extractPublishDate(html) {
    const patterns = [
      /发布于[：:]\s*([^<\r\n]+)/,
      /Posted[：:]\s*([^<\r\n]+)/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return '未知';
  }

  /**
   * 提取更新时间
   */
  extractUpdateDate(html) {
    // 带年份
    const withYearPatterns = [
      /更新于[：:]\s*(\d{4}\s*年[^<\r\n]+)/,
      /Updated[：:]\s*([A-Za-z]+\s+\d+,\s*\d{4}[^<\r\n]+)/i
    ];

    for (const pattern of withYearPatterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // 不带年份
    const withoutYearPatterns = [
      /更新于[：:]\s*(\d{1,2}\s*月\s*\d{1,2}\s*日[^<\r\n]*?)(?:<|$)/,
      /Updated[：:]\s*([A-Za-z]+\s+\d{1,2}[^<\r\n]*?)(?:<|$)/i
    ];

    for (const pattern of withoutYearPatterns) {
      const match = html.match(pattern);
      if (match) {
        const year = new Date().getFullYear();
        return `${match[1].trim()} (${year})`;
      }
    }

    return null;
  }

  /**
   * 显示结果统计
   */
  showResults() {
    const positive = this.reviews.filter(r => r.isPositive).length;
    const negative = this.reviews.length - positive;
    const elapsed = this.formatTime(Date.now() - this.startTime);

    this.logger.info(`📊 检查了 ${this.friendIds.length} 个好友`);
    this.logger.info(`📊 找到 ${this.reviews.length} 篇评测`);
    this.logger.info(`   👍 推荐: ${positive} 篇`);
    this.logger.info(`   👎 不推荐: ${negative} 篇`);
    this.logger.info(`⏱️ 总耗时: ${elapsed}`);
    this.logger.info('');

    // 保存到全局
    window.frfQuickReviews = this.reviews;
    this.logger.info('💾 评测数据已保存到 window.frfQuickReviews');

    // 同步到字典缓存
    this.syncToDict();
  }

  /**
   * 将快速模式结果同步到字典缓存
   */
  syncToDict() {
    if (this.reviews.length === 0) return;

    try {
      const cacheKey = `${Constants.CACHE_KEY_PREFIX}review_dict_${Constants.CACHE_VERSION}`;
      const cached = localStorage.getItem(cacheKey);

      let dictData = {};
      let timestamp = Date.now();

      // 如果已有字典，先加载
      if (cached) {
        const parsed = JSON.parse(cached);
        dictData = parsed.data || {};
        timestamp = parsed.timestamp || Date.now();
      }

      // 更新字典：将快速模式找到的评测同步进去
      let updated = 0;
      for (const review of this.reviews) {
        const steamId = review.steamId;
        const appId = review.appId;

        if (!dictData[steamId]) {
          dictData[steamId] = [];
        }

        if (!dictData[steamId].includes(appId)) {
          dictData[steamId].push(appId);
          updated++;
        }
      }

      // 保存回 localStorage
      if (updated > 0) {
        const cacheData = {
          version: Constants.CACHE_VERSION,
          timestamp: timestamp,
          data: dictData
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        this.logger.info(`📚 已同步 ${updated} 条记录到字典缓存`);
      }

    } catch (error) {
      this.logger.warn('同步到字典缓存失败', error);
    }
  }

  /**
   * 暂停搜索
   */
  pause() {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.logger.info('⏸️ 正在暂停...');
    }
  }

  /**
   * 继续搜索
   */
  async resume() {
    if (this.isPaused && this.currentIndex < this.friendIds.length) {
      this.isPaused = false;
      this.isRunning = true;
      this.logger.info('▶️ 继续搜索...');

      await this.processAllFriends();

      if (!this.isPaused) {
        this.logger.info('');
        this.logger.info('========================================');
        this.logger.info('  ✅ 搜索完成！');
        this.logger.info('========================================');
        this.showResults();

        if (this.onComplete) {
          this.onComplete(this.reviews);
        }
      }
    }
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalFriends: this.friendIds.length,
      foundReviews: this.reviews.length,
      progress: this.friendIds.length > 0
        ? ((this.currentIndex / this.friendIds.length) * 100).toFixed(1)
        : 0
    };
  }

  /**
   * 格式化时间
   */
  formatTime(ms) {
    if (ms < 1000) return '< 1 秒';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} 秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} 分 ${remainingSeconds} 秒`;
  }

  /**
   * 睡眠
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 暴露到全局
if (typeof window !== 'undefined') {
  window.FRF_QuickSearcher = QuickSearcher;
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


// ==================== src/ui/UIRenderer.js ====================

/**
 * UI渲染器
 * 生成Steam原生风格的评测卡片，注入到页面中
 */

class UIRenderer {
  constructor() {
    this.logger = new Logger('UIRenderer');
    this.container = null;
    this.loadingElement = null;
  }

  /**
   * 初始化渲染器，获取或创建目标容器
   */
  init() {
    // 注入样式
    this.injectStyles();

    // 尝试获取现有容器
    this.container = document.querySelector('#AppHubCards');

    if (this.container) {
      this.logger.info('UIRenderer 初始化成功（使用现有容器）');
      return true;
    }

    // 容器不存在（Steam bug页面），需要创建
    this.logger.info('未找到 #AppHubCards，尝试创建容器...');

    // 查找合适的插入位置
    // Steam页面结构：.apphub_HomeHeaderContent 之后是 #apphub_InitialContent
    // 我们要在 .apphub_HomeHeaderContent 的父元素(.apphub_background)内
    // 在 .apphub_HomeHeaderContent 之后插入

    // 优先级1：在 #apphub_InitialContent 后面（原始bug位置之后）
    const initialContent = document.querySelector('#apphub_InitialContent');
    if (initialContent) {
      this.container = this.createContainer();
      initialContent.parentNode.insertBefore(this.container, initialContent.nextSibling);
      this.logger.info('UIRenderer 初始化成功（在 apphub_InitialContent 后创建容器）');
      return true;
    }

    // 优先级2：在 .apphub_HomeHeaderContent 之后
    const headerContent = document.querySelector('.apphub_HomeHeaderContent');
    if (headerContent && headerContent.parentNode) {
      this.container = this.createContainer();
      // 插入到 headerContent 后面的下一个兄弟节点之后
      const nextSibling = headerContent.nextElementSibling;
      if (nextSibling) {
        headerContent.parentNode.insertBefore(this.container, nextSibling.nextSibling);
      } else {
        headerContent.parentNode.appendChild(this.container);
      }
      this.logger.info('UIRenderer 初始化成功（在 apphub_HomeHeaderContent 后创建容器）');
      return true;
    }

    // 优先级3：apphub_background 内部
    const background = document.querySelector('.apphub_background');
    if (background) {
      this.container = this.createContainer();
      background.appendChild(this.container);
      this.logger.info('UIRenderer 初始化成功（在 apphub_background 内创建容器）');
      return true;
    }

    // 优先级4：ModalContentContainer 内部
    const modalContainer = document.querySelector('#ModalContentContainer');
    if (modalContainer) {
      this.container = this.createContainer();
      modalContainer.appendChild(this.container);
      this.logger.info('UIRenderer 初始化成功（在 ModalContentContainer 内创建容器）');
      return true;
    }

    this.logger.error('无法找到合适的容器插入位置');
    return false;
  }

  /**
   * 创建评测卡片容器
   * @returns {HTMLElement}
   */
  createContainer() {
    const container = document.createElement('div');
    container.id = 'AppHubCards';
    container.className = 'apphub_CardContentContainer frf_container';
    // 使用与Steam原生一致的样式
    container.style.cssText = 'clear: both;';
    return container;
  }

  /**
   * 清空容器内容
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * 显示加载状态
   * @param {string} message - 加载提示消息
   */
  showLoading(message = '正在加载好友评测...') {
    if (!this.container) return;

    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'frf_loading';
    this.loadingElement.innerHTML = `
      <div class="frf_loading_content">
        <img src="https://community.fastly.steamstatic.com/public/images/login/throbber.gif" alt="Loading">
        <span class="frf_loading_text">${message}</span>
      </div>
    `;

    // 添加样式
    this.injectStyles();

    this.container.appendChild(this.loadingElement);
  }

  /**
   * 显示修复中提示（在原bug区域显示）
   */
  showFixingNotice() {
    // 确保样式已注入
    this.injectStyles();

    // 在原来bug显示的位置（#apphub_InitialContent之后或其位置）显示提示
    const initialContent = document.querySelector('#apphub_InitialContent');
    const headerContent = document.querySelector('.apphub_HomeHeaderContent');

    // 检查是否已存在
    if (document.querySelector('.frf_fixing_notice')) return;

    const notice = document.createElement('div');
    notice.className = 'frf_fixing_notice';
    notice.innerHTML = `
      <div class="frf_notice_content">
        <img src="https://community.fastly.steamstatic.com/public/images/login/throbber.gif" alt="Loading">
        <span class="frf_notice_text">正在检测好友评测...</span>
      </div>
    `;

    // 找合适的插入位置
    if (initialContent && initialContent.parentNode) {
      initialContent.parentNode.insertBefore(notice, initialContent.nextSibling);
      this.logger.info('显示修复提示（在 apphub_InitialContent 后）');
    } else if (headerContent && headerContent.parentNode) {
      headerContent.parentNode.insertBefore(notice, headerContent.nextSibling);
      this.logger.info('显示修复提示（在 apphub_HomeHeaderContent 后）');
    } else {
      // 备选：添加到 body
      document.body.appendChild(notice);
      this.logger.info('显示修复提示（添加到 body）');
    }
  }

  /**
   * 隐藏修复中提示
   */
  hideFixingNotice() {
    const notice = document.querySelector('.frf_fixing_notice');
    if (notice) {
      notice.remove();
    }
  }

  /**
   * 更新加载进度
   * @param {number} checked - 已检查好友数
   * @param {number} total - 总好友数
   * @param {number} found - 已找到评测数
   */
  updateProgress(checked, total, found = 0) {
    if (this.loadingElement) {
      const textElement = this.loadingElement.querySelector('.frf_loading_text');
      if (textElement) {
        textElement.textContent = `正在加载好友评测... 已检查 ${checked}/${total}，找到 ${found} 篇`;
      }
    }
  }

  /**
   * 隐藏加载状态
   */
  hideLoading() {
    if (this.loadingElement) {
      this.loadingElement.remove();
      this.loadingElement = null;
    }
  }

  /**
   * 渲染单个评测卡片
   * @param {Object} review - 评测数据对象
   * @returns {HTMLElement} 卡片元素
   */
  renderCard(review) {
    const card = document.createElement('div');
    // 使用自定义class，避免Steam CSS干扰
    card.className = 'frf_card';
    card.setAttribute('role', 'button');

    // 构建卡片HTML
    card.innerHTML = this.buildCardHTML(review);

    // 添加点击事件（打开评测详情）
    card.addEventListener('click', (e) => {
      // 如果点击的是链接，不处理
      if (e.target.tagName === 'A' || e.target.closest('a')) return;
      window.open(`https://steamcommunity.com${review.url}`, '_blank');
    });

    return card;
  }

  /**
   * 构建卡片内部HTML - 完全自定义样式，避免Steam CSS干扰
   * @param {Object} review - 评测数据
   * @returns {string} HTML字符串
   */
  buildCardHTML(review) {
    const thumbIcon = review.isPositive
      ? 'https://community.fastly.steamstatic.com/public/shared/images/userreviews/icon_thumbsUp.png?v=1'
      : 'https://community.fastly.steamstatic.com/public/shared/images/userreviews/icon_thumbsDown.png?v=1';

    const recommendText = review.isPositive ? '推荐' : '不推荐';

    // 显示完整评测内容
    const displayContent = review.reviewContent || '';

    // 格式化有价值人数
    const helpfulText = review.helpfulCount > 0
      ? `有 ${review.helpfulCount} 人觉得这篇评测有价值`
      : '尚未有人觉得这篇评测有价值';

    // 用户头像（使用默认头像作为后备）
    const avatarUrl = review.userAvatar ||
      'https://avatars.fastly.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg';

    // 完全自定义HTML结构，使用frf_前缀避免Steam CSS干扰
    return `
      <div class="frf_card_inner">
        <!-- 顶部：有价值人数 -->
        <div class="frf_helpful_row">
          <span class="frf_helpful_text">${helpfulText}</span>
          <span class="frf_award">
            <img src="https://community.fastly.steamstatic.com/public/shared/images/award_icon_blue.svg" class="frf_award_icon">
            <span>0</span>
          </span>
        </div>

        <!-- 推荐区域 -->
        <div class="frf_recommend_row">
          <img src="${thumbIcon}" class="frf_thumb_icon">
          <div class="frf_recommend_info">
            <div class="frf_recommend_title">${recommendText}</div>
            <div class="frf_recommend_hours">总时数 ${review.totalHours} 小时</div>
          </div>
        </div>

        <!-- 发布日期 -->
        <div class="frf_date_row">发布于：${review.publishDate}</div>

        <!-- 评测内容 -->
        <div class="frf_content_row">${displayContent}</div>

        <!-- 底部用户信息栏 -->
        <div class="frf_author_row">
          <div class="frf_author_left">
            <a href="${review.userProfileUrl}" class="frf_avatar_link">
              <img src="${avatarUrl}" class="frf_avatar_img">
            </a>
            <div class="frf_author_info">
              <a href="${review.userProfileUrl}" class="frf_author_name">${review.userName}</a>
              <div class="frf_author_tag">FRF 好友评测</div>
            </div>
          </div>
          <div class="frf_comment_area">
            <span class="frf_comment_icon">💬</span>
            <span class="frf_comment_count">0</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 批量渲染评测卡片
   * @param {Array} reviews - 评测数据数组
   */
  renderAll(reviews) {
    if (!this.container) {
      this.logger.error('容器未初始化');
      return;
    }

    this.hideLoading();
    this.clear();

    if (reviews.length === 0) {
      this.showEmpty();
      return;
    }

    reviews.forEach(review => {
      const card = this.renderCard(review);
      this.container.appendChild(card);
    });

    this.logger.info(`渲染完成，共 ${reviews.length} 条评测`);
  }

  /**
   * 追加单个评测卡片（用于逐步显示）
   * @param {Object} review - 评测数据
   */
  appendCard(review) {
    if (!this.container) return;

    const card = this.renderCard(review);
    this.container.appendChild(card);
  }

  /**
   * 显示空状态
   */
  showEmpty() {
    if (!this.container) return;

    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'frf_empty';
    emptyDiv.innerHTML = `
      <div class="frf_empty_content">
        <p>暂无好友评测此游戏</p>
      </div>
    `;

    this.container.appendChild(emptyDiv);
  }

  /**
   * 显示错误状态
   * @param {string} message - 错误消息
   */
  showError(message) {
    if (!this.container) return;

    this.hideLoading();
    this.clear();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'frf_error';
    errorDiv.innerHTML = `
      <div class="frf_error_content">
        <p>加载失败：${message}</p>
        <button class="frf_retry_btn" onclick="window.FRF && window.FRF.renderUI()">重试</button>
      </div>
    `;

    this.container.appendChild(errorDiv);
  }

  /**
   * 添加刷新按钮到页面（在"关于评测"按钮右边）
   */
  addRefreshButton() {
    // 检查是否已存在
    if (document.querySelector('.frf_refresh_btn')) return;

    // 找到"关于评测"按钮所在的 .learnMore 容器
    const learnMore = document.querySelector('.apphub_SectionFilter .learnMore');
    if (learnMore) {
      const btn = document.createElement('div');
      btn.className = 'frf_refresh_btn';
      btn.style.cssText = 'display: inline-block; margin-left: 10px;';
      btn.innerHTML = `
        <a class="btnv6_blue_hoverfade btn_small_thin">
          <span>FRF 刷新</span>
        </a>
      `;

      btn.addEventListener('click', () => {
        if (window.FRF && window.FRF.renderUI) {
          window.FRF.renderUI(true); // force refresh
        }
      });

      // 插入到"关于评测"按钮后面
      learnMore.parentNode.insertBefore(btn, learnMore.nextSibling);
      return;
    }

    // 备选：添加到筛选区域末尾
    const filterArea = document.querySelector('.apphub_SectionFilter');
    if (filterArea) {
      const btn = document.createElement('div');
      btn.className = 'frf_refresh_btn';
      btn.style.cssText = 'display: inline-block; float: right; margin-right: 10px;';
      btn.innerHTML = `
        <a class="btnv6_blue_hoverfade btn_small_thin">
          <span>FRF 刷新</span>
        </a>
      `;

      btn.addEventListener('click', () => {
        if (window.FRF && window.FRF.renderUI) {
          window.FRF.renderUI(true); // force refresh
        }
      });

      filterArea.appendChild(btn);
    }
  }

  /**
   * 注入自定义样式
   */
  injectStyles() {
    if (document.querySelector('#frf_styles')) return;

    const style = document.createElement('style');
    style.id = 'frf_styles';
    style.textContent = `
      /* FRF 修复提示 - 与加载状态完全一致的样式 */
      .frf_fixing_notice {
        padding: 40px;
        text-align: center;
        color: #8f98a0;
      }

      .frf_notice_content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .frf_notice_text {
        font-size: 14px;
        color: #8f98a0;
      }

      /* FRF 加载状态 */
      .frf_loading {
        padding: 40px;
        text-align: center;
        color: #8f98a0;
      }

      .frf_loading_content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .frf_loading_text {
        font-size: 14px;
      }

      /* FRF 空状态 */
      .frf_empty {
        padding: 40px;
        text-align: center;
        color: #8f98a0;
      }

      /* FRF 错误状态 */
      .frf_error {
        padding: 40px;
        text-align: center;
        color: #c75050;
      }

      .frf_retry_btn {
        margin-top: 10px;
        padding: 8px 16px;
        background: #67c1f5;
        border: none;
        border-radius: 2px;
        color: #fff;
        cursor: pointer;
      }

      .frf_retry_btn:hover {
        background: #4eb4f1;
      }

      /* FRF 刷新按钮 */
      .frf_refresh_btn {
        display: inline-block;
        cursor: pointer;
      }

      /* ========== FRF 卡片样式 - 完全自定义 ========== */

      /* 容器 */
      .frf_container {
        clear: both;
        max-width: 940px;
        margin: 0 auto;
      }

      /* 单个卡片 */
      .frf_card {
        background: rgba(0, 0, 0, 0.3);
        margin-bottom: 26px;
        cursor: pointer;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .frf_card:hover {
        background: rgba(0, 0, 0, 0.25);
      }

      /* 卡片内部容器 */
      .frf_card_inner {
        padding: 0;
      }

      /* 有价值人数行 */
      .frf_helpful_row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        font-size: 12px;
        color: #8f98a0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .frf_helpful_text {
        color: #8f98a0;
      }

      .frf_award {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #67c1f5;
      }

      .frf_award_icon {
        width: 16px;
        height: 16px;
      }

      /* 推荐区域 */
      .frf_recommend_row {
        display: flex;
        align-items: center;
        padding: 12px 14px;
        gap: 12px;
      }

      .frf_thumb_icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
      }

      .frf_recommend_info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .frf_recommend_title {
        font-size: 17px;
        font-weight: normal;
        color: #c6d4df;
      }

      .frf_recommend_hours {
        font-size: 13px;
        color: #8f98a0;
      }

      /* 发布日期 */
      .frf_date_row {
        padding: 0 14px 8px 14px;
        font-size: 12px;
        color: #8f98a0;
      }

      /* 评测内容 */
      .frf_content_row {
        padding: 0 14px 14px 14px;
        font-size: 13px;
        line-height: 1.6;
        color: #acb2b8;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      /* 底部用户信息栏 */
      .frf_author_row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: rgba(0, 0, 0, 0.2);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }

      .frf_author_left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }

      .frf_avatar_link {
        display: block;
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        text-align: left;
      }

      .frf_avatar_img {
        width: 32px;
        height: 32px;
        display: block;
        margin: 0;
        object-fit: cover;
      }

      .frf_author_info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .frf_author_name {
        font-size: 13px;
        color: #c6d4df;
        text-decoration: none;
      }

      .frf_author_name:hover {
        color: #67c1f5;
      }

      .frf_author_tag {
        font-size: 11px;
        color: #8f98a0;
      }

      .frf_comment_area {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #8f98a0;
        font-size: 13px;
      }

      .frf_comment_icon {
        font-size: 14px;
      }

      .frf_comment_count {
        font-size: 13px;
      }
    `;

    document.head.appendChild(style);
  }
}

// 暴露到全局
if (typeof window !== 'undefined') {
  window.FRF_UIRenderer = UIRenderer;
}


// ==================== src/ui/PageDetector.js ====================

/**
 * 页面检测器
 * 自动检测Steam好友评测页面状态，判断是否需要FRF介入
 */

class PageDetector {
  constructor() {
    this.logger = new Logger('PageDetector');
    this.appId = null;
    this.isTriggered = false;
  }

  /**
   * 检测当前页面是否是好友评测页面
   * @returns {boolean}
   */
  isFriendReviewPage() {
    const url = window.location.href;

    // 检查URL是否包含好友评测筛选
    // https://steamcommunity.com/app/413150/reviews/?browsefilter=createdbyfriends
    const isCommunityApp = url.includes('steamcommunity.com/app/');
    const isFriendFilter = url.includes('browsefilter=createdbyfriends') ||
                          url.includes('browsefilter=myfriends');

    // 也检查页面上的筛选器状态
    const filterSelect = document.querySelector('#filterselect_activeday');
    const isFilterActive = filterSelect &&
      (filterSelect.textContent.includes('来自好友') ||
       filterSelect.textContent.includes('From Friends'));

    return isCommunityApp && (isFriendFilter || isFilterActive);
  }

  /**
   * 获取当前页面的App ID
   * @returns {string|null}
   */
  getAppId() {
    if (this.appId) return this.appId;

    // 方法1：从URL提取
    const urlMatch = window.location.href.match(/\/app\/(\d+)/);
    if (urlMatch) {
      this.appId = urlMatch[1];
      return this.appId;
    }

    // 方法2：从页面全局变量提取
    if (typeof g_AppID !== 'undefined') {
      this.appId = String(g_AppID);
      return this.appId;
    }

    // 方法3：从商店链接提取
    const storeLink = document.querySelector('a[href*="store.steampowered.com/app/"]');
    if (storeLink) {
      const match = storeLink.href.match(/\/app\/(\d+)/);
      if (match) {
        this.appId = match[1];
        return this.appId;
      }
    }

    this.logger.warn('无法获取App ID');
    return null;
  }

  /**
   * 检测Steam原生渲染是否成功
   * @returns {Promise<boolean>}
   */
  async checkSteamRenderSuccess() {
    // 等待一段时间让Steam有机会渲染
    await this.wait(2000);

    // 检查多个可能的容器
    const container = document.querySelector('#AppHubCards');
    const initialContent = document.querySelector('#apphub_InitialContent');

    // 情况1：#AppHubCards 存在且有卡片
    if (container) {
      const cards = container.querySelectorAll('.apphub_Card');
      if (cards.length > 0) {
        this.logger.info(`Steam 原生渲染成功，找到 ${cards.length} 条评测`);
        return true;
      }
    }

    // 检查是否有"无更多内容"的提示（说明确实没有好友评测）
    const noContent = document.querySelector('#NoMoreContent');
    if (noContent && noContent.style.display !== 'none') {
      this.logger.info('Steam 显示无更多内容');
      return true; // 这种情况不需要FRF介入
    }

    // 检查是否有加载中状态
    const loading = document.querySelector('#action_wait');
    if (loading && loading.style.display !== 'none') {
      // 再等待一会
      await this.wait(3000);
      if (container) {
        const cardsAfterWait = container.querySelectorAll('.apphub_Card');
        if (cardsAfterWait.length > 0) {
          this.logger.info(`延迟后Steam渲染成功，找到 ${cardsAfterWait.length} 条评测`);
          return true;
        }
      }
    }

    // 情况2：#AppHubCards 不存在（Steam bug 页面）
    // 这种情况下 Steam 的 JS 根本没有创建容器，肯定是 bug
    if (!container) {
      this.logger.warn('未找到 #AppHubCards 容器（Steam Bug）');
      return false;
    }

    // 情况3：检查隐藏的初始内容区域
    if (initialContent) {
      const hiddenCards = initialContent.querySelectorAll('.apphub_Card');
      // 如果有隐藏的卡片但没有显示出来，说明渲染失败
      if (hiddenCards.length > 0) {
        this.logger.warn(`发现 ${hiddenCards.length} 个隐藏卡片，但未被正确渲染（Steam Bug）`);
        return false;
      }
    }

    this.logger.warn('Steam 渲染可能失败，容器为空');
    return false;
  }

  /**
   * 检测并自动触发FRF
   * @param {Function} callback - 需要FRF介入时的回调函数
   * @param {Function} onDetecting - 开始检测时的回调（用于显示"检测中"提示）
   */
  async detectAndTrigger(callback, onDetecting) {
    if (this.isTriggered) {
      this.logger.debug('已经触发过，跳过');
      return;
    }

    // 检查是否是好友评测页面
    if (!this.isFriendReviewPage()) {
      this.logger.debug('非好友评测页面，跳过');
      return;
    }

    const appId = this.getAppId();
    if (!appId) {
      this.logger.error('无法获取App ID，跳过');
      return;
    }

    this.logger.info(`检测到好友评测页面，App ID: ${appId}`);

    // 立即通知开始检测
    if (onDetecting && typeof onDetecting === 'function') {
      onDetecting(appId);
    }

    // 检查Steam原生渲染是否成功
    const steamSuccess = await this.checkSteamRenderSuccess();

    if (steamSuccess) {
      this.logger.info('Steam 原生渲染成功，FRF 不介入');
      // 隐藏修复提示（如果显示了的话）
      this.hideFixingNotice();
      // 仍然添加刷新按钮，以便用户手动刷新
      this.addManualTriggerHint();
      return;
    }

    // Steam渲染失败，触发FRF
    this.logger.info('Steam 渲染失败，FRF 自动介入');
    this.isTriggered = true;

    if (callback && typeof callback === 'function') {
      callback(appId);
    }
  }

  /**
   * 隐藏修复提示
   */
  hideFixingNotice() {
    const notice = document.querySelector('.frf_fixing_notice');
    if (notice) {
      notice.remove();
    }
  }

  /**
   * 添加手动触发提示
   */
  addManualTriggerHint() {
    // 如果Steam正常工作，可以添加一个小提示让用户知道FRF可用
    const filterArea = document.querySelector('.apphub_SectionFilter');
    if (!filterArea) return;

    // 检查是否已存在
    if (document.querySelector('.frf_hint')) return;

    const hint = document.createElement('div');
    hint.className = 'frf_hint';
    hint.style.cssText = 'display: inline-block; margin-left: 10px; font-size: 12px; color: #8f98a0;';
    hint.innerHTML = `
      <span style="cursor: pointer;" onclick="window.FRF && window.FRF.renderUI(true)">
        [FRF 可用]
      </span>
    `;

    filterArea.appendChild(hint);
  }

  /**
   * 监听页面变化（用于SPA导航）
   * @param {Function} callback - 页面变化时的回调函数
   */
  watchPageChanges(callback) {
    // 监听URL变化
    let lastUrl = window.location.href;

    const checkUrlChange = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.isTriggered = false; // 重置触发状态
        this.appId = null; // 重置App ID

        // 延迟检测，等待页面加载
        setTimeout(() => {
          this.detectAndTrigger(callback);
        }, 1000);
      }
    };

    // 定期检查URL变化
    setInterval(checkUrlChange, 1000);

    // 监听popstate事件
    window.addEventListener('popstate', () => {
      this.isTriggered = false;
      this.appId = null;
      setTimeout(() => {
        this.detectAndTrigger(callback);
      }, 1000);
    });
  }

  /**
   * 辅助函数：等待指定毫秒
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重置状态（用于手动触发）
   */
  reset() {
    this.isTriggered = false;
  }
}

// 暴露到全局
if (typeof window !== 'undefined') {
  window.FRF_PageDetector = PageDetector;
}


// ==================== src/main.js ====================

/**
 * FRF - Friend Review Finder v3.0
 * 主程序
 *
 * 双模式架构：
 * - 快速模式：单游戏搜索，遍历好友，获取最新数据
 * - 字典模式：构建缓存字典，多游戏快速查询
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
    this.logger.info('  FRF - Friend Review Finder v3.0');
    this.logger.info('  字典模式 - 多游戏快速查询');
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
     * 刷新/构建字典缓存（支持暂停/继续）
     */
    refresh: async function() {
      console.log('🔄 开始构建字典缓存...');
      const cache = new ReviewCache();
      const steamAPI = new SteamAPI('0');
      const friends = await steamAPI.getFriendsList();

      window.frfCache = cache; // 保存实例以支持暂停/继续
      await cache.buildCache(friends);
    },

    /**
     * 暂停字典构建
     */
    pauseBuild: function() {
      if (window.frfCache) {
        window.frfCache.pauseBuild();
        console.log('⏸️ 字典构建已暂停');
      } else {
        console.log('❌ 没有正在进行的构建任务');
      }
    },

    /**
     * 继续字典构建
     */
    resumeBuild: async function() {
      if (window.frfCache) {
        await window.frfCache.resumeBuild();
      } else {
        // 尝试从 localStorage 恢复
        const cache = new ReviewCache();
        window.frfCache = cache;
        await cache.resumeBuild();
      }
    },

    /**
     * 清除构建进度
     */
    clearProgress: function() {
      const cache = new ReviewCache();
      cache.clearBuildProgress();
      console.log('✅ 构建进度已清除');
    },

    /**
     * 清除缓存
     */
    clearCache: function() {
      const cache = new ReviewCache();
      cache.clearCache();
      cache.clearBuildProgress();
      console.log('✅ 缓存和构建进度已清除');
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
     * 快速模式 - 单游戏搜索（v3.0 新增）
     */
    // 快速模式配置（已优化：基于实测数据）
    _quickConfig: {
      batchSize: 30,
      delay: 0,
      debug: false
    },

    /**
     * 设置快速模式参数
     * @param {Object} config - { batchSize, delay, debug }
     */
    setQuickConfig: function(config) {
      if (config.batchSize !== undefined) this._quickConfig.batchSize = config.batchSize;
      if (config.delay !== undefined) this._quickConfig.delay = config.delay;
      if (config.debug !== undefined) this._quickConfig.debug = config.debug;
      console.log('⚙️ 快速模式配置已更新:', this._quickConfig);
    },

    quick: async function(appId, options = {}) {
      console.log('%c========================================', 'color: #ff9800; font-weight: bold;');
      console.log(`%c  🚀 快速模式 - 游戏 ${appId}`, 'color: #ff9800; font-weight: bold; font-size: 14px;');
      console.log('%c========================================', 'color: #ff9800; font-weight: bold;');
      console.log('');

      const searcher = new QuickSearcher(appId);
      // 应用配置
      searcher.batchSize = this._quickConfig.batchSize;
      searcher.delay = this._quickConfig.delay;
      searcher.debugMode = this._quickConfig.debug;

      console.log(`⚙️ 配置: batch=${searcher.batchSize}, delay=${searcher.delay}ms, debug=${searcher.debugMode}`);
      console.log('');

      window.frfQuickSearcher = searcher; // 保存实例以支持暂停/继续
      await searcher.search({
        onProgress: options.onProgress || ((current, total, found, eta) => {
          if (current % 9 === 0 || current === total) {
            console.log(`📊 进度: ${current}/${total}, 已找到: ${found} 篇, 预计剩余: ${eta}`);
          }
        }),
        onComplete: options.onComplete || ((reviews) => {
          console.log(`✅ 搜索完成！找到 ${reviews.length} 篇评测`);
        }),
        onPause: options.onPause
      });

      return searcher;
    },

    /**
     * 暂停快速搜索
     */
    pause: function() {
      if (window.frfQuickSearcher) {
        window.frfQuickSearcher.pause();
        console.log('⏸️ 搜索已暂停');
      } else {
        console.log('❌ 没有正在进行的搜索');
      }
    },

    /**
     * 继续快速搜索
     */
    resume: async function() {
      if (window.frfQuickSearcher) {
        await window.frfQuickSearcher.resume();
      } else {
        console.log('❌ 没有可继续的搜索');
      }
    },

    /**
     * 显示帮助
     */
    help: function() {
      console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
      console.log('%c  📖 FRF v3.0 使用指南', 'color: #47bfff; font-weight: bold; font-size: 16px;');
      console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
      console.log('');
      console.log('%c🚀 快速模式（推荐）:', 'color: #ff9800; font-weight: bold;');
      console.log('  FRF.quick(appId)     - 单游戏快速搜索');
      console.log('  FRF.pause()          - 暂停搜索');
      console.log('  FRF.resume()         - 继续搜索');
      console.log('');
      console.log('%c📚 字典模式:', 'color: #4caf50; font-weight: bold;');
      console.log('  FRF.test(appId)      - 字典模式查询');
      console.log('  FRF.refresh()        - 构建/刷新字典');
      console.log('  FRF.pauseBuild()     - 暂停构建');
      console.log('  FRF.resumeBuild()    - 继续构建');
      console.log('  FRF.stats()          - 查看缓存统计');
      console.log('');
      console.log('%c🖥️ UI渲染:', 'color: #e91e63; font-weight: bold;');
      console.log('  FRF.renderUI()       - 渲染好友评测到页面');
      console.log('  FRF.renderUI(true)   - 强制刷新重新获取');
      console.log('');
      console.log('%c⚙️ 其他:', 'color: #9e9e9e;');
      console.log('  FRF.getAppId()       - 获取当前页面游戏ID');
      console.log('  FRF.clearCache()     - 清除缓存');
      console.log('  FRF.clearProgress()  - 清除构建进度');
      console.log('  FRF.setDebug(true)   - 开启调试模式');
      console.log('');
      console.log('%c💡 模式对比:', 'color: #2196f3;');
      console.log('  快速模式: 单游戏，最新数据，遍历好友，约42秒');
      console.log('  字典模式: 多游戏，缓存查询，需先构建字典');
      console.log('');
      console.log('%c🔧 自动修复:', 'color: #9c27b0;');
      console.log('  FRF会自动检测Steam好友评测页面的渲染bug');
      console.log('  如果检测到bug，会自动获取并渲染好友评测');
      console.log('');
    },

    // ==================== UI 渲染功能 ====================

    /**
     * UI渲染器实例
     */
    _uiRenderer: null,
    _pageDetector: null,

    /**
     * 渲染好友评测到页面（核心UI功能）
     * @param {boolean} forceRefresh - 是否强制重新获取数据
     */
    renderUI: async function(forceRefresh = false) {
      console.log('%c========================================', 'color: #e91e63; font-weight: bold;');
      console.log('%c  🖥️ FRF UI渲染模式', 'color: #e91e63; font-weight: bold; font-size: 14px;');
      console.log('%c========================================', 'color: #e91e63; font-weight: bold;');
      console.log('');

      // 初始化UI渲染器
      if (!this._uiRenderer) {
        this._uiRenderer = new UIRenderer();
      }

      // 先隐藏修复提示（如果有的话）
      this._uiRenderer.hideFixingNotice();

      if (!this._uiRenderer.init()) {
        console.error('❌ UI渲染器初始化失败，可能不在正确的页面');
        return;
      }

      // 获取App ID
      const appId = this.getAppId();
      if (!appId) {
        console.error('❌ 无法获取App ID');
        return;
      }

      // 添加刷新按钮
      this._uiRenderer.addRefreshButton();

      // 清空并显示加载状态
      this._uiRenderer.clear();
      this._uiRenderer.showLoading('正在加载好友评测...');

      try {
        // 决定使用哪种模式获取数据
        const reviews = await this._fetchReviewsForUI(appId, forceRefresh);

        if (reviews.length === 0) {
          this._uiRenderer.hideLoading();
          this._uiRenderer.showEmpty();
          console.log('😢 没有好友评测此游戏');
          return;
        }

        // 渲染评测卡片
        this._uiRenderer.renderAll(reviews);

        console.log(`✅ 渲染完成，共 ${reviews.length} 条好友评测`);

      } catch (error) {
        console.error('❌ 渲染失败:', error);
        this._uiRenderer.showError(error.message);
      }
    },

    /**
     * 为UI获取评测数据（智能选择模式）
     * @param {string} appId - 游戏ID
     * @param {boolean} forceRefresh - 是否强制刷新
     * @returns {Promise<Array>} 评测数据数组（完整版）
     */
    _fetchReviewsForUI: async function(appId, forceRefresh) {
      const cache = new ReviewCache();
      const cacheLoaded = cache.loadFromCache();

      // 检查字典缓存中是否有这个游戏
      let useQuickMode = forceRefresh || !cacheLoaded;

      if (cacheLoaded && !forceRefresh) {
        const matchedFriends = cache.findFriendsWithReview(appId);
        if (matchedFriends.length > 0) {
          console.log(`📚 字典命中！找到 ${matchedFriends.length} 个好友评测`);
          useQuickMode = false;

          // 使用字典模式：获取详细数据
          return await this._fetchFullReviews(matchedFriends, appId);
        } else {
          console.log('📚 字典中无此游戏记录，切换到快速模式');
          useQuickMode = true;
        }
      }

      if (useQuickMode) {
        console.log('🚀 使用快速模式获取数据...');
        return await this._fetchReviewsQuickMode(appId);
      }
    },

    /**
     * 快速模式获取完整评测数据（用于UI）
     */
    _fetchReviewsQuickMode: async function(appId) {
      const reviews = [];
      const extractor = new ReviewExtractor();

      const searcher = new QuickSearcher(appId);
      searcher.batchSize = this._quickConfig.batchSize;
      searcher.delay = this._quickConfig.delay;

      // 获取好友列表
      const friendIds = await searcher.fetchFriendIds();
      const total = friendIds.length;
      let current = 0;

      console.log(`📊 开始处理 ${total} 个好友...`);

      // 批量处理
      for (let i = 0; i < friendIds.length; i += searcher.batchSize) {
        const batch = friendIds.slice(i, i + searcher.batchSize);

        const batchResults = await Promise.all(
          batch.map(async (steamId) => {
            try {
              // 使用 returnRaw=true 获取原始HTML
              const result = await searcher.checkFriendReview(steamId, true);
              if (result && result.hasReview && result.html) {
                // 用 extractFull 提取完整数据
                const fullReview = extractor.extractFull(result.html, steamId, appId);
                return fullReview;
              }
            } catch (error) {
              // 忽略单个错误
            }
            return null;
          })
        );

        // 收集有效结果并实时渲染
        batchResults.filter(r => r !== null).forEach(review => {
          reviews.push(review);
          // 实时更新UI（逐步显示）
          if (this._uiRenderer) {
            this._uiRenderer.appendCard(review);
          }
        });

        current += batch.length;
        if (this._uiRenderer) {
          this._uiRenderer.updateProgress(current, total, reviews.length);
        }

        // 批次延迟
        if (searcher.delay > 0 && i + searcher.batchSize < friendIds.length) {
          await new Promise(r => setTimeout(r, searcher.delay));
        }
      }

      // 隐藏加载状态（因为我们已经逐步渲染了）
      if (this._uiRenderer) {
        this._uiRenderer.hideLoading();
      }

      // 同步到字典缓存
      if (reviews.length > 0) {
        this._syncQuickResultsToDict(reviews, appId);
      }

      return reviews;
    },

    /**
     * 从字典模式获取完整评测数据
     */
    _fetchFullReviews: async function(friendIds, appId) {
      const reviews = [];
      const extractor = new ReviewExtractor();
      const total = friendIds.length;
      let current = 0;

      console.log(`📥 获取 ${total} 条评测的详细数据...`);

      // 批量获取
      const batchSize = 5;
      for (let i = 0; i < friendIds.length; i += batchSize) {
        const batch = friendIds.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (steamId) => {
            try {
              const url = Constants.STEAM_COMMUNITY + Constants.PROFILE_GAME_REVIEW_URL(steamId, appId);
              const response = await fetch(url, { credentials: 'include' });

              if (response.ok) {
                const html = await response.text();
                // 验证是正确的评测页
                if (html.includes('ratingSummary')) {
                  return extractor.extractFull(html, steamId, appId);
                }
              }
            } catch (error) {
              // 忽略单个错误
            }
            return null;
          })
        );

        // 收集有效结果
        batchResults.filter(r => r !== null).forEach(review => {
          reviews.push(review);
        });

        current += batch.length;
        if (this._uiRenderer) {
          this._uiRenderer.updateProgress(current, total, reviews.length);
        }

        // 批次延迟
        if (i + batchSize < friendIds.length) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      return reviews;
    },

    /**
     * 将快速模式结果同步到字典缓存
     */
    _syncQuickResultsToDict: function(reviews, appId) {
      try {
        const cache = new ReviewCache();
        if (cache.loadFromCache()) {
          reviews.forEach(review => {
            cache.addReviewToCache(review.steamId, appId);
          });
          cache.saveToCache();
          console.log(`🔗 已将 ${reviews.length} 条评测同步到字典缓存`);
        }
      } catch (error) {
        console.warn('同步到字典失败:', error);
      }
    },

    /**
     * 启动自动检测
     */
    startAutoDetect: function() {
      if (!this._pageDetector) {
        this._pageDetector = new PageDetector();
      }

      // 初始化UI渲染器（用于显示修复提示）
      if (!this._uiRenderer) {
        this._uiRenderer = new UIRenderer();
      }
      // 注入样式
      this._uiRenderer.injectStyles();

      const self = this;

      // 立即检测当前页面
      this._pageDetector.detectAndTrigger(
        // onNeedFix: Steam渲染失败，需要FRF修复
        (appId) => {
          console.log(`🔧 检测到Steam渲染bug，自动启动FRF修复...`);
          // 开始渲染（会自动隐藏修复提示）
          self.renderUI();
        },
        // onDetecting: 开始检测时立即显示提示
        (appId) => {
          console.log(`🔍 检测好友评测页面渲染状态...`);
          self._uiRenderer.showFixingNotice();
        }
      );

      // 监听页面变化（SPA导航）
      this._pageDetector.watchPageChanges((appId) => {
        console.log(`🔧 页面变化，重新检测...`);
        // 立即显示修复提示
        self._uiRenderer.showFixingNotice();
        // 开始渲染
        self.renderUI();
      });

      console.log('👀 FRF 自动检测已启动');
    }
  };

  // 欢迎信息
  console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
  console.log('%c  🚀 FRF v3.1 已加载', 'color: #47bfff; font-weight: bold; font-size: 16px;');
  console.log('%c  Friend Review Finder', 'color: #47bfff;');
  console.log('%c  自动修复Steam好友评测Bug', 'color: #e91e63; font-weight: bold;');
  console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
  console.log('');
  console.log('📖 输入 %cFRF.help()%c 查看使用说明', 'color: #ff9800; font-weight: bold;', '');
  console.log('🖥️ UI渲染: %cFRF.renderUI()%c - 渲染好友评测到页面', 'color: #e91e63; font-weight: bold;', '');
  console.log('🚀 快速模式: %cFRF.quick(appId)%c - 单游戏最新数据', 'color: #ff9800; font-weight: bold;', '');
  console.log('📚 字典模式: %cFRF.test(appId)%c - 多游戏快速查询', 'color: #4caf50; font-weight: bold;', '');
  console.log('');

  // 自动启动检测（延迟执行，等待页面加载完成）
  setTimeout(() => {
    window.FRF.startAutoDetect();
  }, 2000);
}



})();
