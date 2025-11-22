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
   * @param {Function} onNeedFix - 需要FRF修复时的回调
   * @param {Function} onPageReady - 页面准备好时的回调（用于显示欢迎横幅和按钮）
   */
  async detectAndTrigger(onNeedFix, onPageReady) {
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

    // 立即显示欢迎横幅和FRF按钮（不等待检测结果）
    if (onPageReady && typeof onPageReady === 'function') {
      onPageReady(appId);
    }

    // 后台检查Steam原生渲染是否成功
    const steamSuccess = await this.checkSteamRenderSuccess();

    if (steamSuccess) {
      this.logger.info('Steam 原生渲染成功，FRF 待命');
      // Steam正常工作，横幅和按钮保留，用户可手动使用FRF
      return;
    }

    // Steam渲染失败，自动触发FRF修复
    this.logger.info('Steam 渲染失败，FRF 自动介入');
    this.isTriggered = true;

    if (onNeedFix && typeof onNeedFix === 'function') {
      onNeedFix(appId);
    }
  }

  /**
   * 隐藏欢迎横幅
   */
  hideWelcomeBanner() {
    const banner = document.querySelector('.frf_welcome_banner');
    if (banner) {
      banner.remove();
    }
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
