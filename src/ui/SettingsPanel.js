/**
 * 设置面板 UI 组件 - v5.1
 * 提供用户可视化配置界面
 *
 * 分为两个标签页：
 * - 常规设置：普通用户常用功能
 * - 高级设置：开发者/高级用户选项
 */

class SettingsPanel {
  constructor() {
    this.logger = new Logger('SettingsPanel');
    this.isOpen = false;
    this.panelElement = null;
    this.overlayElement = null;
    this.currentTab = 'general'; // 'general' | 'advanced'
  }

  /**
   * 初始化设置面板
   */
  init() {
    this.injectStyles();
    this.createPanel();
    this.createSettingsButton();
  }

  /**
   * 创建设置按钮（添加到 FRF 刷新按钮旁边）
   */
  createSettingsButton() {
    // 检查是否已存在
    if (document.querySelector('.frf_settings_btn')) return;

    const btn = document.createElement('div');
    btn.className = 'frf_settings_btn';
    btn.innerHTML = `
      <a class="btnv6_blue_hoverfade btn_small_thin">
        <span>FRF 设置</span>
      </a>
    `;

    btn.addEventListener('click', () => {
      this.toggle();
    });

    // 找到 FRF 刷新按钮，插入到后面
    const refreshBtn = document.querySelector('.frf_refresh_btn');
    if (refreshBtn && refreshBtn.parentNode) {
      refreshBtn.parentNode.insertBefore(btn, refreshBtn.nextSibling);
      return;
    }

    // 备选：找到筛选区域
    const filterArea = document.querySelector('.apphub_SectionFilter');
    if (filterArea) {
      filterArea.appendChild(btn);
    }
  }

  /**
   * 创建设置面板 DOM
   */
  createPanel() {
    // 遮罩层
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'frf_settings_overlay';
    this.overlayElement.addEventListener('click', () => this.close());

    // 面板
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'frf_settings_panel';
    this.panelElement.innerHTML = this.buildPanelHTML();

    // 添加到页面
    document.body.appendChild(this.overlayElement);
    document.body.appendChild(this.panelElement);

    // 设置版本号（确保在运行时正确读取）
    const versionSpan = this.panelElement.querySelector('#frf_version');
    if (versionSpan) {
      versionSpan.textContent = Constants.VERSION;
    }

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 构建面板 HTML - 带标签页
   */
  buildPanelHTML() {
    return `
      <div class="frf_settings_header">
        <h2>FRF 设置</h2>
        <button class="frf_settings_close" title="关闭">✕</button>
      </div>

      <!-- 标签页导航 -->
      <div class="frf_tabs">
        <button class="frf_tab frf_tab_active" data-tab="general">常规设置</button>
        <button class="frf_tab" data-tab="advanced">高级设置</button>
      </div>

      <div class="frf_settings_content">
        <!-- ========== 常规设置 ========== -->
        <div class="frf_tab_content frf_tab_content_active" data-tab="general">
          <!-- 显示设置 -->
          <div class="frf_settings_section">
            <h3>显示设置</h3>
            <div class="frf_settings_row">
              <label for="frf_render_batch">每次渲染评测数</label>
              <div class="frf_input_group">
                <input type="number" id="frf_render_batch" min="1" max="20" value="3">
                <span class="frf_input_hint">找到几篇后开始显示（推荐 3）</span>
              </div>
            </div>
            <div class="frf_settings_row">
              <label for="frf_content_truncate">评测内容截断长度</label>
              <div class="frf_input_group">
                <input type="number" id="frf_content_truncate" min="50" max="1000" value="300">
                <span class="frf_input_hint">字符数（推荐 300）</span>
              </div>
            </div>
          </div>

          <!-- 性能设置 -->
          <div class="frf_settings_section">
            <h3>性能设置</h3>
            <div class="frf_settings_row">
              <label for="frf_background_update">后台静默更新</label>
              <div class="frf_toggle_group">
                <label class="frf_toggle">
                  <input type="checkbox" id="frf_background_update" checked>
                  <span class="frf_toggle_slider"></span>
                </label>
                <span class="frf_input_hint">缓存加载后自动检查更新</span>
              </div>
            </div>
          </div>

          <!-- 缓存管理 -->
          <div class="frf_settings_section">
            <h3>缓存管理</h3>
            <div class="frf_settings_info" id="frf_cache_info">
              <div class="frf_info_loading">正在加载缓存信息...</div>
            </div>
            <div class="frf_settings_actions">
              <button class="frf_btn frf_btn_danger" id="frf_clear_cache">清除缓存</button>
              <button class="frf_btn frf_btn_secondary" id="frf_refresh_stats">刷新统计</button>
            </div>
          </div>

          <!-- 关于 -->
          <div class="frf_settings_section">
            <h3>关于</h3>
            <div class="frf_about_info">
              <p><strong>FRF - Friend Review Finder</strong></p>
              <p>版本：<span id="frf_version">-</span></p>
              <p>
                <a href="https://github.com/JohnS3248/FRF" target="_blank">GitHub</a> ·
                <a href="https://github.com/JohnS3248/FRF/issues" target="_blank">反馈问题</a>
              </p>
            </div>
          </div>
        </div>

        <!-- ========== 高级设置 ========== -->
        <div class="frf_tab_content" data-tab="advanced">
          <div class="frf_advanced_warning">
            <span class="frf_warning_icon">⚠️</span>
            <span>以下为高级选项，如不了解请勿修改</span>
          </div>

          <!-- 快速模式配置 -->
          <div class="frf_settings_section">
            <h3>快速模式配置</h3>
            <div class="frf_settings_row">
              <label for="frf_batch_size">批次大小</label>
              <div class="frf_input_group">
                <input type="number" id="frf_batch_size" min="1" max="50" value="30">
                <span class="frf_input_hint">并发请求数（推荐 30）</span>
              </div>
            </div>
            <div class="frf_settings_row">
              <label for="frf_delay">批次延迟</label>
              <div class="frf_input_group">
                <input type="number" id="frf_delay" min="0" max="5000" value="0">
                <span class="frf_input_hint">毫秒（推荐 0）</span>
              </div>
            </div>
          </div>

          <!-- 调试选项 -->
          <div class="frf_settings_section">
            <h3>调试选项</h3>
            <div class="frf_settings_row">
              <label for="frf_debug_mode">调试模式</label>
              <div class="frf_toggle_group">
                <label class="frf_toggle">
                  <input type="checkbox" id="frf_debug_mode">
                  <span class="frf_toggle_slider"></span>
                </label>
                <span class="frf_input_hint">显示详细日志</span>
              </div>
            </div>
            <div class="frf_settings_row">
              <label for="frf_quick_debug">快速模式调试</label>
              <div class="frf_toggle_group">
                <label class="frf_toggle">
                  <input type="checkbox" id="frf_quick_debug">
                  <span class="frf_toggle_slider"></span>
                </label>
                <span class="frf_input_hint">显示每个请求的响应时间</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="frf_settings_footer">
        <button class="frf_btn frf_btn_primary" id="frf_save_settings">保存设置</button>
        <button class="frf_btn frf_btn_secondary" id="frf_reset_settings">恢复默认</button>
      </div>
    `;
  }

  /**
   * 绑定事件处理
   */
  bindEvents() {
    // 关闭按钮
    this.panelElement.querySelector('.frf_settings_close').addEventListener('click', () => {
      this.close();
    });

    // 标签页切换
    this.panelElement.querySelectorAll('.frf_tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // 清除缓存
    this.panelElement.querySelector('#frf_clear_cache').addEventListener('click', () => {
      this.clearCache();
    });

    // 刷新统计
    this.panelElement.querySelector('#frf_refresh_stats').addEventListener('click', () => {
      this.loadCacheStats();
    });

    // 保存设置
    this.panelElement.querySelector('#frf_save_settings').addEventListener('click', () => {
      this.saveSettings();
    });

    // 恢复默认
    this.panelElement.querySelector('#frf_reset_settings').addEventListener('click', () => {
      this.resetSettings();
    });

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * 切换标签页
   */
  switchTab(tabName) {
    this.currentTab = tabName;

    // 更新标签按钮状态
    this.panelElement.querySelectorAll('.frf_tab').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('frf_tab_active');
      } else {
        tab.classList.remove('frf_tab_active');
      }
    });

    // 更新内容区域
    this.panelElement.querySelectorAll('.frf_tab_content').forEach(content => {
      if (content.dataset.tab === tabName) {
        content.classList.add('frf_tab_content_active');
      } else {
        content.classList.remove('frf_tab_content_active');
      }
    });
  }

  /**
   * 加载缓存统计信息
   */
  loadCacheStats() {
    const infoContainer = this.panelElement.querySelector('#frf_cache_info');

    try {
      const cache = new ReviewCache();
      const hasCache = cache.loadFromCache();

      if (hasCache) {
        const stats = cache.getCacheStats();
        infoContainer.innerHTML = `
          <div class="frf_stats_grid">
            <div class="frf_stat_item">
              <span class="frf_stat_value">${stats.friendsWithReviews}</span>
              <span class="frf_stat_label">缓存好友数</span>
            </div>
            <div class="frf_stat_item">
              <span class="frf_stat_value">${stats.totalReviews}</span>
              <span class="frf_stat_label">总评测记录</span>
            </div>
            <div class="frf_stat_item">
              <span class="frf_stat_value">${stats.cacheAge || '-'}</span>
              <span class="frf_stat_label">缓存时间 (小时)</span>
            </div>
          </div>
        `;
      } else {
        infoContainer.innerHTML = `
          <div class="frf_no_cache">
            <p>暂无缓存数据</p>
            <p class="frf_hint">首次使用 FRF 刷新后会自动创建缓存</p>
          </div>
        `;
      }
    } catch (error) {
      infoContainer.innerHTML = `
        <div class="frf_error_msg">加载缓存信息失败: ${error.message}</div>
      `;
    }
  }

  /**
   * 加载当前设置到表单
   */
  loadSettings() {
    const settings = this.loadFromStorage() || {};

    // 常规设置
    this.panelElement.querySelector('#frf_render_batch').value = settings.renderBatch || 3;
    this.panelElement.querySelector('#frf_content_truncate').value = settings.contentTruncate || 300;
    this.panelElement.querySelector('#frf_background_update').checked = settings.backgroundUpdate !== false; // 默认开启

    // 高级设置
    if (window.FRF && window.FRF._quickConfig) {
      const config = window.FRF._quickConfig;
      this.panelElement.querySelector('#frf_batch_size').value = settings.batchSize || config.batchSize || 30;
      this.panelElement.querySelector('#frf_delay').value = settings.delay || config.delay || 0;
      this.panelElement.querySelector('#frf_quick_debug').checked = settings.quickDebug || config.debug || false;
    } else {
      this.panelElement.querySelector('#frf_batch_size').value = settings.batchSize || 30;
      this.panelElement.querySelector('#frf_delay').value = settings.delay || 0;
      this.panelElement.querySelector('#frf_quick_debug').checked = settings.quickDebug || false;
    }

    // 调试模式
    this.panelElement.querySelector('#frf_debug_mode').checked = settings.debugMode || Constants.DEBUG_MODE || false;

    // 加载缓存统计
    this.loadCacheStats();

    // 重置到常规标签页
    this.switchTab('general');
  }

  /**
   * 保存设置
   */
  saveSettings() {
    // 常规设置
    const renderBatch = parseInt(this.panelElement.querySelector('#frf_render_batch').value, 10);
    const contentTruncate = parseInt(this.panelElement.querySelector('#frf_content_truncate').value, 10);
    const backgroundUpdate = this.panelElement.querySelector('#frf_background_update').checked;

    // 高级设置
    const batchSize = parseInt(this.panelElement.querySelector('#frf_batch_size').value, 10);
    const delay = parseInt(this.panelElement.querySelector('#frf_delay').value, 10);
    const debugMode = this.panelElement.querySelector('#frf_debug_mode').checked;
    const quickDebug = this.panelElement.querySelector('#frf_quick_debug').checked;

    // 验证常规设置
    if (renderBatch < 1 || renderBatch > 20) {
      this.showToast('每次渲染数必须在 1-20 之间', 'error');
      return;
    }

    if (contentTruncate < 50 || contentTruncate > 1000) {
      this.showToast('截断长度必须在 50-1000 之间', 'error');
      return;
    }

    // 验证高级设置
    if (batchSize < 1 || batchSize > 50) {
      this.showToast('批次大小必须在 1-50 之间', 'error');
      return;
    }

    if (delay < 0 || delay > 5000) {
      this.showToast('批次延迟必须在 0-5000 之间', 'error');
      return;
    }

    // 应用设置到 FRF
    if (window.FRF) {
      // 高级设置
      window.FRF.setQuickConfig({
        batchSize,
        delay,
        debug: quickDebug
      });
      window.FRF.setDebug(debugMode);

      // 常规设置（存储到 FRF 对象）
      window.FRF._uiConfig = {
        renderBatch,
        contentTruncate,
        backgroundUpdate
      };
    }

    // 保存到 localStorage
    this.saveToStorage({
      // 常规
      renderBatch,
      contentTruncate,
      backgroundUpdate,
      // 高级
      batchSize,
      delay,
      debugMode,
      quickDebug
    });

    this.showToast('设置已保存', 'success');
    this.logger.info('设置已保存', { renderBatch, contentTruncate, backgroundUpdate, batchSize, delay, debugMode, quickDebug });
  }

  /**
   * 恢复默认设置
   */
  resetSettings() {
    // 常规设置默认值
    this.panelElement.querySelector('#frf_render_batch').value = 3;
    this.panelElement.querySelector('#frf_content_truncate').value = 300;
    this.panelElement.querySelector('#frf_background_update').checked = true;

    // 高级设置默认值
    this.panelElement.querySelector('#frf_batch_size').value = 30;
    this.panelElement.querySelector('#frf_delay').value = 0;
    this.panelElement.querySelector('#frf_debug_mode').checked = false;
    this.panelElement.querySelector('#frf_quick_debug').checked = false;

    this.showToast('已恢复默认设置，点击保存生效', 'info');
  }

  /**
   * 清除缓存
   */
  clearCache() {
    if (confirm('确定要清除所有缓存数据吗？\n\n清除后下次访问游戏页面需要重新搜索。')) {
      try {
        const cache = new ReviewCache();
        cache.clearCache();
        this.loadCacheStats();
        this.showToast('缓存已清除', 'success');
      } catch (error) {
        this.showToast('清除缓存失败: ' + error.message, 'error');
      }
    }
  }

  /**
   * 保存设置到 localStorage
   */
  saveToStorage(settings) {
    try {
      localStorage.setItem('frf_settings', JSON.stringify(settings));
    } catch (error) {
      this.logger.warn('保存设置失败', error);
    }
  }

  /**
   * 从 localStorage 加载设置
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('frf_settings');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      this.logger.warn('加载设置失败', error);
      return null;
    }
  }

  /**
   * 应用保存的设置（启动时调用）
   */
  applySavedSettings() {
    const settings = this.loadFromStorage();
    if (settings && window.FRF) {
      // 高级设置
      window.FRF.setQuickConfig({
        batchSize: settings.batchSize || 30,
        delay: settings.delay || 0,
        debug: settings.quickDebug || false
      });

      if (settings.debugMode) {
        Constants.DEBUG_MODE = true;
      }

      // 常规设置
      window.FRF._uiConfig = {
        renderBatch: settings.renderBatch || 3,
        contentTruncate: settings.contentTruncate || 300,
        backgroundUpdate: settings.backgroundUpdate !== false
      };

      this.logger.info('已应用保存的设置', settings);
    }
  }

  /**
   * 显示 Toast 提示
   */
  showToast(message, type = 'info') {
    // 移除已有的 toast
    const existingToast = document.querySelector('.frf_toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `frf_toast frf_toast_${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // 动画显示
    setTimeout(() => toast.classList.add('frf_toast_show'), 10);

    // 3秒后隐藏
    setTimeout(() => {
      toast.classList.remove('frf_toast_show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 打开设置面板
   */
  open() {
    this.loadSettings();
    this.overlayElement.classList.add('frf_show');
    this.panelElement.classList.add('frf_show');
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
  }

  /**
   * 关闭设置面板
   */
  close() {
    this.overlayElement.classList.remove('frf_show');
    this.panelElement.classList.remove('frf_show');
    this.isOpen = false;
    document.body.style.overflow = '';
  }

  /**
   * 切换设置面板
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 注入样式
   */
  injectStyles() {
    if (document.querySelector('#frf_settings_styles')) return;

    const style = document.createElement('style');
    style.id = 'frf_settings_styles';
    style.textContent = `
      /* 设置按钮 */
      .frf_settings_btn {
        display: inline-block;
        margin-left: 10px;
        cursor: pointer;
      }

      /* 遮罩层 */
      .frf_settings_overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9998;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .frf_settings_overlay.frf_show {
        opacity: 1;
        visibility: visible;
      }

      /* 设置面板 */
      .frf_settings_panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        width: 520px;
        max-width: 90vw;
        max-height: 85vh;
        background: linear-gradient(180deg, #2a475e 0%, #1b2838 100%);
        border: 1px solid #4a6278;
        border-radius: 6px;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }

      .frf_settings_panel.frf_show {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, -50%) scale(1);
      }

      /* 面板头部 */
      .frf_settings_header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #4a6278;
        background: rgba(0, 0, 0, 0.2);
      }

      .frf_settings_header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: normal;
        color: #fff;
      }

      .frf_settings_close {
        background: transparent;
        border: none;
        color: #8f98a0;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .frf_settings_close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      /* 标签页导航 */
      .frf_tabs {
        display: flex;
        padding: 0 20px;
        background: rgba(0, 0, 0, 0.15);
        border-bottom: 1px solid #4a6278;
      }

      .frf_tab {
        padding: 12px 20px;
        background: transparent;
        border: none;
        color: #8f98a0;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
      }

      .frf_tab:hover {
        color: #c6d4df;
      }

      .frf_tab_active {
        color: #67c1f5;
      }

      .frf_tab_active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: #67c1f5;
      }

      /* 标签页内容 */
      .frf_tab_content {
        display: none;
      }

      .frf_tab_content_active {
        display: block;
      }

      /* 面板内容 */
      .frf_settings_content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      /* 高级设置警告 */
      .frf_advanced_warning {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: rgba(255, 152, 0, 0.15);
        border: 1px solid rgba(255, 152, 0, 0.3);
        border-radius: 4px;
        margin-bottom: 20px;
        font-size: 12px;
        color: #ffc107;
      }

      .frf_warning_icon {
        font-size: 16px;
      }

      /* 设置区块 */
      .frf_settings_section {
        margin-bottom: 24px;
      }

      .frf_settings_section:last-child {
        margin-bottom: 0;
      }

      .frf_settings_section h3 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: bold;
        color: #67c1f5;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* 设置行 */
      .frf_settings_row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .frf_settings_row:last-child {
        border-bottom: none;
      }

      .frf_settings_row > label {
        color: #c6d4df;
        font-size: 13px;
      }

      /* 输入组 */
      .frf_input_group {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .frf_input_group input[type="number"] {
        width: 80px;
        padding: 6px 10px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #4a6278;
        border-radius: 3px;
        color: #fff;
        font-size: 13px;
        text-align: center;
      }

      .frf_input_group input[type="number"]:focus {
        outline: none;
        border-color: #67c1f5;
      }

      .frf_input_hint {
        font-size: 11px;
        color: #8f98a0;
      }

      /* 开关组 */
      .frf_toggle_group {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      /* 开关样式 */
      .frf_toggle {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }

      .frf_toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .frf_toggle_slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #4a6278;
        border-radius: 24px;
        transition: all 0.3s;
      }

      .frf_toggle_slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 2px;
        bottom: 2px;
        background: #8f98a0;
        border-radius: 50%;
        transition: all 0.3s;
      }

      .frf_toggle input:checked + .frf_toggle_slider {
        background: #5ba32b;
        border-color: #5ba32b;
      }

      .frf_toggle input:checked + .frf_toggle_slider:before {
        transform: translateX(20px);
        background: #fff;
      }

      /* 统计信息 */
      .frf_settings_info {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        padding: 16px;
        margin-bottom: 12px;
      }

      .frf_stats_grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        text-align: center;
      }

      .frf_stat_item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .frf_stat_value {
        font-size: 24px;
        font-weight: bold;
        color: #67c1f5;
      }

      .frf_stat_label {
        font-size: 11px;
        color: #8f98a0;
      }

      .frf_no_cache {
        text-align: center;
        color: #8f98a0;
      }

      .frf_no_cache .frf_hint {
        font-size: 12px;
        margin-top: 4px;
      }

      .frf_info_loading {
        text-align: center;
        color: #8f98a0;
      }

      .frf_error_msg {
        color: #c75050;
        text-align: center;
      }

      /* 操作按钮组 */
      .frf_settings_actions {
        display: flex;
        gap: 10px;
      }

      /* 按钮样式 */
      .frf_btn {
        padding: 8px 16px;
        border: none;
        border-radius: 3px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .frf_btn_primary {
        background: linear-gradient(90deg, #47bfff 0%, #1a9fff 100%);
        color: #fff;
      }

      .frf_btn_primary:hover {
        background: linear-gradient(90deg, #66ccff 0%, #47bfff 100%);
      }

      .frf_btn_secondary {
        background: rgba(103, 193, 245, 0.2);
        color: #67c1f5;
        border: 1px solid #67c1f5;
      }

      .frf_btn_secondary:hover {
        background: rgba(103, 193, 245, 0.3);
      }

      .frf_btn_danger {
        background: rgba(199, 80, 80, 0.2);
        color: #c75050;
        border: 1px solid #c75050;
      }

      .frf_btn_danger:hover {
        background: rgba(199, 80, 80, 0.3);
      }

      /* 面板底部 */
      .frf_settings_footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 20px;
        border-top: 1px solid #4a6278;
        background: rgba(0, 0, 0, 0.2);
      }

      /* 关于信息 */
      .frf_about_info {
        color: #8f98a0;
        font-size: 13px;
        line-height: 1.6;
      }

      .frf_about_info p {
        margin: 4px 0;
      }

      .frf_about_info a {
        color: #67c1f5;
        text-decoration: none;
      }

      .frf_about_info a:hover {
        text-decoration: underline;
      }

      /* Toast 提示 */
      .frf_toast {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        padding: 12px 24px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
      }

      .frf_toast_show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      .frf_toast_success {
        background: #5ba32b;
        color: #fff;
      }

      .frf_toast_error {
        background: #c75050;
        color: #fff;
      }

      .frf_toast_info {
        background: #67c1f5;
        color: #fff;
      }

      /* 滚动条样式 */
      .frf_settings_content::-webkit-scrollbar {
        width: 8px;
      }

      .frf_settings_content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
      }

      .frf_settings_content::-webkit-scrollbar-thumb {
        background: #4a6278;
        border-radius: 4px;
      }

      .frf_settings_content::-webkit-scrollbar-thumb:hover {
        background: #5a7288;
      }
    `;

    document.head.appendChild(style);
  }
}

// 暴露到全局
if (typeof window !== 'undefined') {
  window.FRF_SettingsPanel = SettingsPanel;
}
