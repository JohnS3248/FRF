/**
 * 常量定义 - 新架构
 * 集中管理所有配置参数和魔法数字
 */

const Constants = {
  // ==================== 版本信息 ====================
  VERSION: '5.1.3',
  CACHE_VERSION: 'v2', // 渐进式缓存版本

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
