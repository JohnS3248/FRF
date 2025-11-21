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
