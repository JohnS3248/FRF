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
      funnyCount: this.extractFunnyCount(html),

      // 互动数据
      commentCount: this.extractCommentCount(html),
      awardCount: this.extractAwardCount(html),
      awards: this.extractAwards(html)  // 奖励图标列表
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

  /**
   * 提取评论数
   * 页面结构: <span id="commentthread_..._totalcount">16</span> 条留言
   */
  extractCommentCount(html) {
    const patterns = [
      // 中文：totalcount + 条留言
      /commentthread_[^"]*_totalcount[^>]*>(\d+)<\/span>\s*条留言/,
      // 英文：totalcount + Comments
      /commentthread_[^"]*_totalcount[^>]*>(\d+)<\/span>\s*Comments?/i,
      // 备用：直接匹配 totalcount
      /_totalcount[^>]*>(\d+)</,
      // 备用：直接匹配数字+留言
      />(\d+)<\/span>\s*条留言/,
      />(\d+)<\/span>\s*Comments?</i
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
   * 提取奖励数
   * 页面结构:
   * - 每个奖励类型有一个 <span class="review_award_count">数字</span>
   * - more_btn 的 data-count 是"隐藏的额外奖励类型数量"，不是总数
   * - 正确算法：累加所有 review_award_count，但排除 more_btn 里的那个
   *
   * 例：57的纸房子评测
   * - 显示的奖励：1+1+3+2+1+2+1+1+1 = 13
   * - more_btn显示"8"表示还有8种隐藏奖励类型
   * - 总奖励数 = 13（累加所有非more_btn的count）
   */
  extractAwardCount(html) {
    // 提取 review_award_ctn 区域的HTML
    const awardCtnMatch = html.match(/review_award_ctn">([\s\S]*?)<\/div>\s*<\/div>/);
    if (!awardCtnMatch) {
      return 0;
    }

    const awardHtml = awardCtnMatch[1];

    // 累加所有 review_award_count 的数字
    const countMatches = [...awardHtml.matchAll(/review_award_count[^>]*>(\d+)<\/span>/g)];
    let total = 0;

    for (const match of countMatches) {
      total += parseInt(match[1], 10);
    }

    // 如果存在 more_btn，需要减去它显示的数字（因为那不是奖励数，是隐藏类型数）
    const moreBtnMatch = awardHtml.match(/more_btn[^>]*>[\s\S]*?review_award_count[^>]*>(\d+)<\/span>/);
    if (moreBtnMatch) {
      total -= parseInt(moreBtnMatch[1], 10);
    }

    return total > 0 ? total : 0;
  }

  /**
   * 提取奖励图标列表（用于UI显示）
   * 返回每个奖励的图标URL、数量、名称
   *
   * Steam HTML结构分析：
   * <div class="review_award tooltip" data-tooltip-html="...reaction_award_name&gt;金独角兽&lt;...">
   *   <img class="review_award_icon" src="https://.../still/11.png"/>
   *   <span class="review_award_count hidden">1</span>
   * </div>
   *
   * 需要排除 more_btn：class="review_award more_btn tooltip"
   *
   * @param {string} html - 评测页面HTML
   * @returns {Array<{iconUrl: string, count: number, name: string}>}
   */
  extractAwards(html) {
    const awards = [];

    // 提取 review_award_ctn 区域
    const awardCtnMatch = html.match(/review_award_ctn">([\s\S]*?)(?:<\/div>\s*<\/div>\s*<\/div>|<div class="review_rate_bar)/);
    if (!awardCtnMatch) {
      return awards;
    }

    const awardHtml = awardCtnMatch[1];

    // 分步提取：先找到每个 review_award div（排除 more_btn）
    // 使用更宽松的正则，逐个提取信息
    const awardDivPattern = /<div[^>]*class="review_award tooltip"[^>]*data-tooltip-html="([^"]*)"[^>]*>[\s\S]*?<img[^>]*class="review_award_icon"[^>]*src="([^"]+)"[^>]*\/>[\s\S]*?<span[^>]*class="review_award_count[^"]*"[^>]*>(\d+)<\/span>/g;

    let match;
    while ((match = awardDivPattern.exec(awardHtml)) !== null) {
      const tooltipHtml = match[1];
      const iconUrl = match[2];
      const count = parseInt(match[3], 10);

      // 从 tooltip HTML 中提取奖励名称（HTML转义格式）
      // 格式：&lt;div class=&quot;reaction_award_name&quot;&gt;金独角兽&lt;/div&gt;
      const nameMatch = tooltipHtml.match(/reaction_award_name[^>]*&gt;([^&]+)&lt;/);
      const name = nameMatch ? nameMatch[1].trim() : '奖励';

      // 使用动态图标（animated）替换静态图标（still）
      const animatedIconUrl = iconUrl.replace('/still/', '/animated/');

      awards.push({
        name,
        iconUrl: animatedIconUrl,
        staticIconUrl: iconUrl,
        count
      });
    }

    return awards;
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
