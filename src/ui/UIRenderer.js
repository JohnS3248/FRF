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
   * 显示 FRF 欢迎横幅（进入好友评测页面立即显示）
   */
  showWelcomeBanner() {
    // 确保样式已注入
    this.injectStyles();

    // 检查是否已存在
    if (document.querySelector('.frf_welcome_banner')) return;

    const banner = document.createElement('div');
    banner.className = 'frf_welcome_banner';
    banner.innerHTML = `
      <div class="frf_banner_content">
        <div class="frf_banner_icon">🚀</div>
        <div class="frf_banner_text">
          <div class="frf_banner_title">FRF 好友评测增强工具已启动</div>
          <div class="frf_banner_desc">
            <span class="frf_banner_item">• 检测到渲染问题将自动修复</span>
            <span class="frf_banner_item">• 点击上方 <strong>FRF 刷新</strong> 按钮可使用增强阅读模式</span>
          </div>
        </div>
        <button class="frf_banner_close" title="关闭提示">✕</button>
      </div>
    `;

    // 关闭按钮事件
    banner.querySelector('.frf_banner_close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideWelcomeBanner();
    });

    // 找合适的插入位置（在筛选栏下方）
    const filterArea = document.querySelector('.apphub_SectionFilter');
    if (filterArea && filterArea.parentNode) {
      filterArea.parentNode.insertBefore(banner, filterArea.nextSibling);
      this.logger.info('显示欢迎横幅（在筛选栏后）');
    } else {
      // 备选位置
      const initialContent = document.querySelector('#apphub_InitialContent');
      if (initialContent && initialContent.parentNode) {
        initialContent.parentNode.insertBefore(banner, initialContent);
        this.logger.info('显示欢迎横幅（在 apphub_InitialContent 前）');
      }
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
   * 显示修复中提示（已废弃，保留兼容）
   * @deprecated 使用 showWelcomeBanner 替代
   */
  showFixingNotice() {
    // 改为显示欢迎横幅
    this.showWelcomeBanner();
  }

  /**
   * 隐藏修复中提示（已废弃，保留兼容）
   * @deprecated 使用 hideWelcomeBanner 替代
   */
  hideFixingNotice() {
    this.hideWelcomeBanner();
  }

  /**
   * 显示数据更新提示（后台更新发现数据改动时显示）
   * @param {string} message - 提示消息
   */
  showUpdateNotice(message) {
    // 先移除已有的提示
    this.hideUpdateNotice();

    const notice = document.createElement('div');
    notice.className = 'frf_update_notice';
    notice.innerHTML = `
      <div class="frf_update_content">
        <span class="frf_update_icon">🔔</span>
        <span class="frf_update_text">${message}</span>
        <button class="frf_update_btn" title="点击刷新获取最新数据">刷新</button>
        <button class="frf_update_close" title="忽略">✕</button>
      </div>
    `;

    // 刷新按钮事件
    notice.querySelector('.frf_update_btn').addEventListener('click', () => {
      this.hideUpdateNotice();
      if (window.FRF && window.FRF.renderUI) {
        window.FRF.renderUI(true); // 强制刷新
      }
    });

    // 关闭按钮事件
    notice.querySelector('.frf_update_close').addEventListener('click', () => {
      this.hideUpdateNotice();
    });

    // 插入到页面顶部（容器之前）
    if (this.container && this.container.parentNode) {
      this.container.parentNode.insertBefore(notice, this.container);
    } else {
      // 备选：插入到筛选栏后面
      const filterArea = document.querySelector('.apphub_SectionFilter');
      if (filterArea && filterArea.parentNode) {
        filterArea.parentNode.insertBefore(notice, filterArea.nextSibling);
      }
    }

    this.logger.info('显示更新提示:', message);
  }

  /**
   * 隐藏数据更新提示
   */
  hideUpdateNotice() {
    const notice = document.querySelector('.frf_update_notice');
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
   * @returns {Promise<HTMLElement>} 卡片元素
   */
  async renderCard(review) {
    const card = document.createElement('div');
    // 使用自定义class，避免Steam CSS干扰
    card.className = 'frf_card';
    card.setAttribute('role', 'button');

    // 处理截图链接（异步）
    if (review.reviewContent) {
      review.reviewContent = await this.processScreenshots(review.reviewContent);
    }

    // 构建卡片HTML
    card.innerHTML = this.buildCardHTML(review);

    // 添加点击事件（打开评测详情）
    card.addEventListener('click', (e) => {
      // 如果点击的是链接或图片，不处理
      if (e.target.tagName === 'A' || e.target.tagName === 'IMG' || e.target.closest('a')) return;
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

    // 截断过长的评测内容（安全截断，避免破坏HTML标签）
    // 从设置读取截断长度，默认300；设为0表示不截断
    const uiConfig = window.FRF && window.FRF._uiConfig;
    const maxContentLength = (uiConfig && typeof uiConfig.contentTruncate === 'number') ? uiConfig.contentTruncate : 300;
    let displayContent = this.safeHTMLTruncate(review.reviewContent || '', maxContentLength);

    // 格式化有价值/欢乐人数（如果都为0则不显示）
    let helpfulText = '';
    if (review.helpfulCount > 0 && review.funnyCount > 0) {
      helpfulText = `有 ${review.helpfulCount} 人觉得这篇评测有价值，有 ${review.funnyCount} 人觉得这篇评测很欢乐`;
    } else if (review.helpfulCount > 0) {
      helpfulText = `有 ${review.helpfulCount} 人觉得这篇评测有价值`;
    } else if (review.funnyCount > 0) {
      helpfulText = `有 ${review.funnyCount} 人觉得这篇评测很欢乐`;
    }
    // 如果都为0，helpfulText保持空字符串，不显示该行

    // 构建奖励HTML（优先显示图标，fallback显示数量）
    const awards = review.awards || [];
    const awardCount = review.awardCount || 0;
    let awardsHtml = '';

    if (awards.length > 0) {
      // 有奖励详情：显示图标
      awardsHtml = awards.map(award => `
        <div class="frf_award_item" title="${award.name}">
          <img src="${award.iconUrl}" alt="${award.name}">
          ${award.count > 1 ? `<span class="frf_award_count">${award.count}</span>` : ''}
        </div>
      `).join('');
    } else if (awardCount > 0) {
      // 没有奖励详情但有数量：显示奖励数（fallback）
      awardsHtml = `
        <div class="frf_award">
          <img class="frf_award_icon" src="https://community.fastly.steamstatic.com/public/images/skin_1/award_icon.png" alt="Award">
          <span>${awardCount}</span>
        </div>
      `;
    }

    // 用户头像（使用默认头像作为后备）
    const avatarUrl = review.userAvatar ||
      'https://avatars.fastly.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg';

    // 头像框（如果有）
    const avatarFrameUrl = review.avatarFrame;

    // 构建头像HTML（支持头像框）
    let avatarHtml = '';
    if (avatarFrameUrl) {
      // 有头像框：使用双层结构
      avatarHtml = `
        <div class="frf_avatar_container">
          <img src="${avatarUrl}" class="frf_avatar_img">
          <img src="${avatarFrameUrl}" class="frf_avatar_frame">
        </div>
      `;
    } else {
      // 无头像框：普通单层头像
      avatarHtml = `<img src="${avatarUrl}" class="frf_avatar_img">`;
    }

    // 格式化日期显示（发布于 + 更新于）
    let dateText = `发布于：${review.publishDate}`;
    if (review.updateDate) {
      dateText += `<br>更新于：${review.updateDate}`;
    }

    // 完全自定义HTML结构，使用frf_前缀避免Steam CSS干扰
    return `
      <div class="frf_card_inner">
        <!-- 顶部：有价值人数 + 奖励图标 -->
        ${(helpfulText || awardsHtml) ? `
        <div class="frf_helpful_row">
          <span class="frf_helpful_text">${helpfulText}</span>
          <div class="frf_awards_container">
            ${awardsHtml}
          </div>
        </div>
        ` : ''}

        <!-- 推荐区域 -->
        <div class="frf_recommend_row">
          <img src="${thumbIcon}" class="frf_thumb_icon">
          <div class="frf_recommend_info">
            <div class="frf_recommend_title">${recommendText}</div>
            <div class="frf_recommend_hours">总时数 ${review.totalHours} 小时</div>
          </div>
        </div>

        <!-- 发布/更新日期 -->
        <div class="frf_date_row">${dateText}</div>

        <!-- 评测内容 -->
        <div class="frf_content_row">${displayContent}</div>

        <!-- 底部用户信息栏 -->
        <div class="frf_author_row">
          <div class="frf_author_left">
            <a href="${review.userProfileUrl}" class="frf_avatar_link">
              ${avatarHtml}
            </a>
            <div class="frf_author_info">
              <a href="${review.userProfileUrl}" class="frf_author_name">${review.userName}</a>
              <div class="frf_author_tag">${review.hoursAtReview ? `评测时 ${review.hoursAtReview} 小时` : ''}</div>
            </div>
          </div>
          <div class="frf_comment_area">
            <svg class="frf_comment_icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 6h-2V3c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v14l4-4h7v4c0 1.1.9 2 2 2h7l4 4V8c0-1.1-.9-2-2-2zM5 11c-.83 0-1.5-.67-1.5-1.5S4.17 8 5 8s1.5.67 1.5 1.5S5.83 11 5 11zm4 0c-.83 0-1.5-.67-1.5-1.5S8.17 8 9 8s1.5.67 1.5 1.5S9.83 11 9 11zm4 0c-.83 0-1.5-.67-1.5-1.5S12.17 8 13 8s1.5.67 1.5 1.5S13.83 11 13 11z"/>
            </svg>
            <span class="frf_comment_count">${review.commentCount || 0}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 批量渲染评测卡片
   * @param {Array} reviews - 评测数据数组
   */
  async renderAll(reviews) {
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

    // 逐个渲染（异步处理截图）
    for (const review of reviews) {
      const card = await this.renderCard(review);
      this.container.appendChild(card);
    }

    this.logger.info(`渲染完成，共 ${reviews.length} 条评测`);
  }

  /**
   * 追加单个评测卡片（用于逐步显示）
   * @param {Object} review - 评测数据
   */
  async appendCard(review) {
    if (!this.container) return;

    const card = await this.renderCard(review);
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
   * 安全截断HTML内容，避免破坏标签结构
   * @param {string} html - HTML内容
   * @param {number} maxLength - 最大纯文本长度
   * @returns {string} 截断后的HTML
   */
  safeHTMLTruncate(html, maxLength) {
    if (!html) return '';

    // maxLength 为 0 表示不截断，直接返回原内容
    if (maxLength === 0) return html;

    // 先统计纯文本长度（不含HTML标签）
    const textContent = html.replace(/<[^>]*>/g, '');
    if (textContent.length <= maxLength) {
      return html;
    }

    // 需要截断：逐字符遍历，跟踪标签状态
    let result = '';
    let textCount = 0;
    let inTag = false;
    let currentTag = '';
    const openTags = []; // 记录打开的标签

    for (let i = 0; i < html.length && textCount < maxLength; i++) {
      const char = html[i];

      if (char === '<') {
        inTag = true;
        currentTag = '<';
      } else if (char === '>') {
        inTag = false;
        currentTag += '>';
        result += currentTag;

        // 解析标签名
        const tagMatch = currentTag.match(/^<\/?([a-zA-Z]+)/);
        if (tagMatch) {
          const tagName = tagMatch[1].toLowerCase();
          if (currentTag.startsWith('</')) {
            // 闭合标签：从栈中移除
            const idx = openTags.lastIndexOf(tagName);
            if (idx !== -1) openTags.splice(idx, 1);
          } else if (!currentTag.endsWith('/>') && !['br', 'hr', 'img'].includes(tagName)) {
            // 开始标签（非自闭合）：加入栈
            openTags.push(tagName);
          }
        }
        currentTag = '';
        continue;
      } else if (inTag) {
        currentTag += char;
      } else {
        // 普通文本字符
        result += char;
        textCount++;
      }
    }

    // 添加省略号
    result += '...';

    // 闭合所有未闭合的标签（逆序）
    for (let i = openTags.length - 1; i >= 0; i--) {
      result += `</${openTags[i]}>`;
    }

    return result;
  }

  /**
   * 处理评测内容中的截图链接，替换为实际图片
   * @param {string} content - 原始评测内容HTML
   * @returns {Promise<string>} 处理后的HTML
   */
  async processScreenshots(content) {
    if (!content) return content;

    // 匹配完整的 <a> 标签包裹的 Steam 截图链接
    // 原始格式: <a class="bb_link" href="https://steamcommunity.com/sharedfiles/filedetails/?id=xxx" target="_blank" ...>https://steamcommunity.com/sharedfiles/filedetails/?id=xxx</a>
    const screenshotLinkRegex = /<a[^>]*href="(https:\/\/steamcommunity\.com\/sharedfiles\/filedetails\/\?id=(\d+))"[^>]*>.*?<\/a>/g;
    const matches = [...content.matchAll(screenshotLinkRegex)];

    if (matches.length === 0) return content;

    this.logger.info(`发现 ${matches.length} 个截图链接，正在获取图片...`);

    // 并行获取所有截图的图片URL
    const imageUrls = await Promise.all(
      matches.map(match => this.fetchScreenshotImage(match[2])) // match[2] 是文件ID
    );

    // 替换链接为图片
    let processedContent = content;
    matches.forEach((match, index) => {
      const imageUrl = imageUrls[index];
      const originalUrl = match[1]; // 原始链接URL
      const fullMatch = match[0];   // 完整的 <a> 标签
      if (imageUrl) {
        // 替换整个 <a> 标签为图片容器
        const imgHtml = `<div class="frf_screenshot_container"><a href="${originalUrl}" target="_blank"><img src="${imageUrl}" class="frf_screenshot_img" alt="Steam 截图"></a></div>`;
        processedContent = processedContent.replace(fullMatch, imgHtml);
      }
      // 如果获取失败，保留原链接
    });

    return processedContent;
  }

  /**
   * 获取截图页面的图片URL
   * @param {string} fileId - 截图文件ID
   * @returns {Promise<string|null>} 图片URL或null
   */
  async fetchScreenshotImage(fileId) {
    const url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${fileId}`;
    const retryDelay = 10000;    // 重试等待时间（10秒）
    const maxRetryDuration = 60000; // 最大重试时长（1分钟）
    const requestStartTime = Date.now();

    while (true) {
      try {
        const response = await fetch(url, {
          credentials: 'include',
          redirect: 'follow'
        });

        // 429 限流处理：无限重试，最多1分钟
        if (response.status === 429) {
          const totalElapsed = Date.now() - requestStartTime;
          if (totalElapsed < maxRetryDuration) {
            this.logger.info(`截图 ${fileId} 遇到 429 限流，等待 ${retryDelay/1000}s 后重试...`);
            await new Promise(r => setTimeout(r, retryDelay));
            continue;
          } else {
            this.logger.warn(`截图 ${fileId} 获取失败：超过最大重试时长`);
            return null;
          }
        }

        if (!response.ok) {
          this.logger.warn(`截图 ${fileId} 获取失败：HTTP ${response.status}`);
          return null;
        }

        const html = await response.text();

        // 从 og:image 提取图片URL
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
        if (ogImageMatch) {
          // 解码HTML实体
          let imageUrl = ogImageMatch[1].replace(/&amp;/g, '&');
          // 移除尺寸限制参数，保持原图比例，只设置合理的最大宽度
          imageUrl = imageUrl.replace(/imw=\d+/, 'imw=800').replace(/&imh=\d+/, '').replace(/&ima=[^&]+/, '').replace(/&impolicy=[^&]+/, '').replace(/&imcolor=[^&]+/, '').replace(/&letterbox=[^&]+/, '');
          this.logger.info(`截图 ${fileId} 图片URL获取成功`);
          return imageUrl;
        }

        // 备选：从 actualmediactn 提取
        const actualMediaMatch = html.match(/class="actualmediactn"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/);
        if (actualMediaMatch) {
          let imageUrl = actualMediaMatch[1].replace(/&amp;/g, '&');
          this.logger.info(`截图 ${fileId} 图片URL获取成功（备选方式）`);
          return imageUrl;
        }

        this.logger.warn(`截图 ${fileId} 未找到图片URL`);
        return null;

      } catch (error) {
        this.logger.error(`截图 ${fileId} 获取出错：${error.message}`);
        return null;
      }
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
      /* FRF 欢迎横幅 */
      .frf_welcome_banner {
        background: linear-gradient(135deg, rgba(103, 193, 245, 0.15) 0%, rgba(78, 180, 241, 0.1) 100%);
        border: 1px solid rgba(103, 193, 245, 0.3);
        border-radius: 4px;
        margin: 10px 0 15px 0;
        padding: 12px 16px;
      }

      .frf_banner_content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .frf_banner_icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .frf_banner_text {
        flex: 1;
      }

      .frf_banner_title {
        font-size: 14px;
        font-weight: bold;
        color: #67c1f5;
        margin-bottom: 4px;
      }

      .frf_banner_desc {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .frf_banner_item {
        font-size: 12px;
        color: #acb2b8;
      }

      .frf_banner_item strong {
        color: #67c1f5;
      }

      .frf_banner_close {
        background: transparent;
        border: none;
        color: #8f98a0;
        font-size: 16px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 2px;
        transition: all 0.2s;
      }

      .frf_banner_close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      /* FRF 更新提示 */
      .frf_update_notice {
        background: linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 193, 7, 0.15) 100%);
        border: 1px solid rgba(255, 152, 0, 0.4);
        border-radius: 4px;
        margin: 10px 0 15px 0;
        padding: 10px 16px;
      }

      .frf_update_content {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .frf_update_icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .frf_update_text {
        flex: 1;
        font-size: 13px;
        color: #ffc107;
      }

      .frf_update_btn {
        background: #ff9800;
        border: none;
        color: #fff;
        font-size: 12px;
        padding: 6px 14px;
        border-radius: 2px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .frf_update_btn:hover {
        background: #f57c00;
      }

      .frf_update_close {
        background: transparent;
        border: none;
        color: #8f98a0;
        font-size: 14px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 2px;
        transition: all 0.2s;
      }

      .frf_update_close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
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

      /* 奖励图标容器 */
      .frf_awards_container {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-wrap: wrap;
      }

      .frf_award_item {
        display: flex;
        align-items: center;
        position: relative;
        cursor: default;
      }

      .frf_award_item img {
        width: 20px;
        height: 20px;
        object-fit: contain;
      }

      .frf_award_count {
        font-size: 10px;
        color: #acb2b8;
        margin-left: 1px;
        font-weight: bold;
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

      /* 截图容器 - 自适应图片尺寸 */
      .frf_screenshot_container {
        margin: 12px 0;
        border-radius: 4px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.2);
        display: inline-block;
        max-width: 100%;
      }

      .frf_screenshot_container a {
        display: block;
      }

      .frf_screenshot_img {
        max-width: 100%;
        height: auto;
        display: block;
        transition: opacity 0.2s;
      }

      .frf_screenshot_img:hover {
        opacity: 0.9;
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

      /* 头像容器（用于头像框场景） */
      .frf_avatar_container {
        position: relative;
        width: 32px;
        height: 32px;
        display: block;
      }

      .frf_avatar_img {
        width: 32px;
        height: 32px;
        display: block;
        margin: 0;
        object-fit: cover;
      }

      /* 头像框：绝对定位覆盖在头像上方，按官方比例放大约1.21倍 */
      .frf_avatar_frame {
        position: absolute;
        top: -4px;
        left: -4px;
        width: 40px;
        height: 40px;
        pointer-events: none;
        z-index: 1;
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
        width: 16px;
        height: 16px;
        opacity: 0.7;
        flex-shrink: 0;
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
