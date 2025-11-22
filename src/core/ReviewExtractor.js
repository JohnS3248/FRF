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
