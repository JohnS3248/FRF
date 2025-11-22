/**
 * FRF - Friend Review Finder v5.0
 * 主程序
 *
 * 智能缓存架构：
 * - 快速模式：单游戏搜索，遍历好友，获取最新数据
 * - 渐进式缓存：快速搜索结果自动同步到缓存
 * - 后台更新：缓存命中时先显示，后台静默检查更新
 *
 * v5.0 改进：
 * - 移除废弃的 FriendReviewFinder 类
 * - 精简代码结构
 * - 新增设置面板
 */

// ==================== 全局暴露 ====================
if (typeof window !== 'undefined') {
  // 全局辅助对象
  window.FRF = {
    /**
     * 缓存查询（仅在有缓存时工作）
     * 缓存通过快速搜索自动构建
     */
    test: async function(appId) {
      console.log(`%c========================================`, 'color: #47bfff; font-weight: bold;');
      console.log(`%c  📚 缓存查询 - 游戏 ${appId}`, 'color: #47bfff; font-weight: bold; font-size: 14px;');
      console.log(`%c========================================`, 'color: #47bfff; font-weight: bold;');
      console.log('');

      const cache = new ReviewCache();
      const cacheLoaded = cache.loadFromCache();

      if (!cacheLoaded) {
        console.log('%c❌ 缓存不存在！', 'color: #ff5722; font-weight: bold;');
        console.log('');
        console.log('💡 缓存通过快速搜索自动构建：');
        console.log('   %cFRF.quick(' + appId + ')%c - 快速搜索此游戏（结果自动缓存）', 'color: #ff9800; font-weight: bold;', '');
        return null;
      }

      // 查询游戏
      const matchedFriends = cache.findFriendsWithReview(String(appId));

      if (matchedFriends.length === 0) {
        console.log('😢 缓存中没有此游戏的好友评测记录');
        console.log('');
        console.log('💡 可能原因：');
        console.log('   1. 你的好友没有评测过这款游戏');
        console.log('   2. 这是你第一次访问此游戏页面');
        console.log('');
        console.log('🚀 使用快速模式获取数据：');
        console.log('   %cFRF.quick(' + appId + ')%c', 'color: #ff9800; font-weight: bold;', '');
        return [];
      }

      console.log(`🎯 找到 ${matchedFriends.length} 个好友评测了这款游戏`);
      console.log('');

      // 获取详细数据
      const steamAPI = new SteamAPI(appId);
      const reviews = await steamAPI.batchGetReviews(matchedFriends, (current, total, found) => {
        if (current % 5 === 0 || current === total) {
          console.log(`📊 进度: ${current}/${total}`);
        }
      });

      // 显示结果统计
      const positive = reviews.filter(r => r.isPositive).length;
      const negative = reviews.length - positive;

      console.log('');
      console.log('========================================');
      console.log('  ✅ 查询完成！');
      console.log('========================================');
      console.log(`📊 找到 ${reviews.length} 篇评测`);
      console.log(`   👍 推荐: ${positive} 篇`);
      console.log(`   👎 不推荐: ${negative} 篇`);
      console.log('');

      // 显示详细列表
      if (reviews.length > 0) {
        console.log('📋 评测列表:');
        console.table(reviews.map((r, i) => ({
          '#': i + 1,
          '推荐': r.isPositive ? '👍' : '👎',
          '时长': `${r.totalHours}h`,
          '发布': r.publishDate,
          '更新': r.updateDate || '-',
          'Steam ID': r.steamId
        })));
      }

      window.frfReviews = reviews;
      console.log('💾 评测数据已保存到 window.frfReviews');

      return reviews;
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
     * 快速模式 - 单游戏搜索
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
      console.log('%c  📖 FRF v5.0 使用指南', 'color: #47bfff; font-weight: bold; font-size: 16px;');
      console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
      console.log('');
      console.log('%c🔧 自动模式（默认）:', 'color: #9c27b0; font-weight: bold;');
      console.log('  FRF会自动检测Steam好友评测页面');
      console.log('  有缓存时秒加载，同时后台检查更新');
      console.log('  无缓存时自动执行快速搜索');
      console.log('');
      console.log('%c🚀 快速搜索:', 'color: #ff9800; font-weight: bold;');
      console.log('  FRF.quick(appId)     - 快速搜索指定游戏');
      console.log('  FRF.pause()          - 暂停搜索');
      console.log('  FRF.resume()         - 继续搜索');
      console.log('');
      console.log('%c🖥️ UI渲染:', 'color: #e91e63; font-weight: bold;');
      console.log('  FRF.renderUI()       - 渲染好友评测到页面');
      console.log('  FRF.renderUI(true)   - 强制刷新重新获取');
      console.log('');
      console.log('%c⚙️ 设置:', 'color: #9e9e9e;');
      console.log('  FRF.openSettings()   - 打开设置面板');
      console.log('  FRF.getAppId()       - 获取当前页面游戏ID');
      console.log('  FRF.stats()          - 查看缓存统计');
      console.log('  FRF.clearCache()     - 清除缓存');
      console.log('  FRF.setDebug(true)   - 开启调试模式');
      console.log('');
      console.log('%c💡 工作原理:', 'color: #2196f3;');
      console.log('  1. 首次访问游戏页：快速搜索 (~42秒)，结果自动缓存');
      console.log('  2. 再次访问同游戏：秒加载缓存，后台静默检查更新');
      console.log('  3. 发现数据改动：页面顶部提示，点击可刷新');
      console.log('');
    },

    // ==================== UI 渲染功能 ====================

    /**
     * UI渲染器实例
     */
    _uiRenderer: null,
    _pageDetector: null,
    _settingsPanel: null,

    /**
     * 打开设置面板
     */
    openSettings: function() {
      if (!this._settingsPanel) {
        this._settingsPanel = new SettingsPanel();
        this._settingsPanel.init();
      }
      this._settingsPanel.open();
    },

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

      // 隐藏欢迎横幅（开始渲染后不需要了）
      this._uiRenderer.hideWelcomeBanner();

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
     * 优先级：缓存秒加载 + 后台更新 > 快速模式
     *
     * @param {string} appId - 游戏ID
     * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
     * @returns {Promise<Array>} 评测数据数组（完整版）
     */
    _fetchReviewsForUI: async function(appId, forceRefresh) {
      const cache = new ReviewCache();

      // 强制刷新时直接使用快速模式
      if (forceRefresh) {
        console.log('🔄 强制刷新，使用快速模式...');
        return await this._fetchReviewsQuickMode(appId);
      }

      // 检查缓存
      const cacheLoaded = cache.loadFromCache();

      if (cacheLoaded) {
        const matchedFriends = cache.findFriendsWithReview(appId);
        if (matchedFriends.length > 0) {
          console.log(`📚 缓存命中！找到 ${matchedFriends.length} 个好友评测`);
          // 使用缓存数据：分批获取详细数据
          const cachedReviews = await this._fetchFullReviews(matchedFriends, appId);

          // 启动后台静默更新
          this._backgroundUpdate(appId, cachedReviews);

          return cachedReviews;
        } else {
          console.log('📚 缓存中无此游戏记录，切换到快速模式');
        }
      } else {
        console.log('📚 无缓存，使用快速模式');
      }

      // 使用快速模式
      console.log('🚀 使用快速模式获取数据...');
      return await this._fetchReviewsQuickMode(appId);
    },

    /**
     * 后台静默更新
     * 在缓存加载完成后，后台运行快速搜索检查是否有数据改动
     *
     * @param {string} appId - 游戏ID
     * @param {Array} cachedReviews - 缓存中的评测数据
     */
    _backgroundUpdate: async function(appId, cachedReviews) {
      console.log('🔄 后台静默更新启动...');

      try {
        // 后台执行快速搜索（静默模式，不渲染）
        const freshSteamIds = await this._quickScanForSteamIds(appId);

        // 比较差异
        const cachedSteamIds = cachedReviews.map(r => r.steamId);
        const diff = this._compareReviewSets(cachedSteamIds, freshSteamIds);

        if (diff.hasChanges) {
          console.log(`🔔 后台更新发现数据改动: +${diff.added.length} -${diff.removed.length}`);
          // 显示更新提示
          this._showUpdateNotice(diff);

          // 同步缓存：添加新评测，移除已删除的评测
          const cache = new ReviewCache();
          cache.loadFromCache();

          // 添加新发现的评测
          diff.added.forEach(steamId => {
            cache.addReviewToCache(steamId, appId);
          });

          // 移除已删除的评测
          diff.removed.forEach(steamId => {
            cache.removeReviewFromCache(steamId, appId);
          });

          cache.saveToCache();
          console.log(`🔗 缓存已更新: +${diff.added.length} -${diff.removed.length}`);
        } else {
          console.log('✅ 后台更新完成，数据无改动');
        }
      } catch (error) {
        console.warn('后台更新失败:', error);
      }
    },

    /**
     * 快速扫描获取Steam IDs（不获取详细数据，只检查哪些好友有评测）
     * 用于后台更新时快速比对
     *
     * @param {string} appId - 游戏ID
     * @returns {Promise<Array<string>>} 有评测的好友Steam ID列表
     */
    _quickScanForSteamIds: async function(appId) {
      const searcher = new QuickSearcher(appId);
      searcher.batchSize = this._quickConfig.batchSize;
      searcher.delay = this._quickConfig.delay;

      const friendIds = await searcher.fetchFriendIds();
      const steamIdsWithReview = [];

      // 批量检查（不获取详细内容）
      for (let i = 0; i < friendIds.length; i += searcher.batchSize) {
        const batch = friendIds.slice(i, i + searcher.batchSize);

        const results = await Promise.all(
          batch.map(async (steamId) => {
            try {
              const result = await searcher.checkFriendReview(steamId, false);
              return result ? steamId : null;
            } catch {
              return null;
            }
          })
        );

        results.filter(id => id !== null).forEach(id => {
          steamIdsWithReview.push(id);
        });

        // 批次延迟
        if (searcher.delay > 0 && i + searcher.batchSize < friendIds.length) {
          await new Promise(r => setTimeout(r, searcher.delay));
        }
      }

      return steamIdsWithReview;
    },

    /**
     * 比较两组评测数据，找出差异
     *
     * @param {Array<string>} cachedIds - 缓存中的Steam ID列表
     * @param {Array<string>} freshIds - 最新的Steam ID列表
     * @returns {Object} 差异信息 { hasChanges, added, removed }
     */
    _compareReviewSets: function(cachedIds, freshIds) {
      const cachedSet = new Set(cachedIds);
      const freshSet = new Set(freshIds);

      const added = freshIds.filter(id => !cachedSet.has(id));
      const removed = cachedIds.filter(id => !freshSet.has(id));

      return {
        hasChanges: added.length > 0 || removed.length > 0,
        added,
        removed
      };
    },

    /**
     * 显示数据更新提示
     *
     * @param {Object} diff - 差异信息
     */
    _showUpdateNotice: function(diff) {
      if (!this._uiRenderer) return;

      // 构建提示消息
      let message = '发现数据改动';
      if (diff.added.length > 0 && diff.removed.length > 0) {
        message = `发现数据改动（+${diff.added.length} 新增，-${diff.removed.length} 移除）`;
      } else if (diff.added.length > 0) {
        message = `发现 ${diff.added.length} 条新评测`;
      } else if (diff.removed.length > 0) {
        message = `有 ${diff.removed.length} 条评测已不可用`;
      }

      this._uiRenderer.showUpdateNotice(message);
    },

    /**
     * 快速模式获取完整评测数据（用于UI）
     * 分批渲染：每找到N篇评测立即渲染（N由设置控制）
     */
    _fetchReviewsQuickMode: async function(appId) {
      const reviews = [];
      const pendingRender = []; // 待渲染队列
      // 从设置读取渲染批次大小，默认3
      const RENDER_BATCH_SIZE = (this._uiConfig && this._uiConfig.renderBatch) || 3;
      const extractor = new ReviewExtractor();

      const searcher = new QuickSearcher(appId);
      searcher.batchSize = this._quickConfig.batchSize;
      searcher.delay = this._quickConfig.delay;

      // 获取好友列表
      const friendIds = await searcher.fetchFriendIds();
      const total = friendIds.length;
      let current = 0;

      console.log(`📊 开始处理 ${total} 个好友...`);

      // 分批渲染函数
      const flushRenderQueue = () => {
        if (pendingRender.length > 0 && this._uiRenderer) {
          pendingRender.forEach(review => {
            this._uiRenderer.appendCard(review);
          });
          console.log(`🎨 渲染了 ${pendingRender.length} 篇评测，共 ${reviews.length} 篇`);
          pendingRender.length = 0; // 清空队列
        }
      };

      // 批量处理好友
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

        // 收集有效结果
        batchResults.filter(r => r !== null).forEach(review => {
          reviews.push(review);
          pendingRender.push(review);

          // 每满5篇就渲染一次
          if (pendingRender.length >= RENDER_BATCH_SIZE) {
            flushRenderQueue();
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

      // 渲染剩余的评测
      flushRenderQueue();

      // 隐藏加载状态
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
     * 分批渲染：每获取N篇评测立即渲染（N由设置控制）
     */
    _fetchFullReviews: async function(friendIds, appId) {
      const reviews = [];
      const pendingRender = []; // 待渲染队列
      // 从设置读取渲染批次大小，默认3
      const RENDER_BATCH_SIZE = (this._uiConfig && this._uiConfig.renderBatch) || 3;
      const extractor = new ReviewExtractor();
      const total = friendIds.length;
      let current = 0;

      console.log(`📥 获取 ${total} 条评测的详细数据...`);

      // 分批渲染函数
      const flushRenderQueue = () => {
        if (pendingRender.length > 0 && this._uiRenderer) {
          pendingRender.forEach(review => {
            this._uiRenderer.appendCard(review);
          });
          console.log(`🎨 渲染了 ${pendingRender.length} 篇评测，共 ${reviews.length} 篇`);
          pendingRender.length = 0; // 清空队列
        }
      };

      // 批量获取（网络请求批次）
      const fetchBatchSize = 5;
      for (let i = 0; i < friendIds.length; i += fetchBatchSize) {
        const batch = friendIds.slice(i, i + fetchBatchSize);

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
          pendingRender.push(review);

          // 每满5篇就渲染一次
          if (pendingRender.length >= RENDER_BATCH_SIZE) {
            flushRenderQueue();
          }
        });

        current += batch.length;
        if (this._uiRenderer) {
          this._uiRenderer.updateProgress(current, total, reviews.length);
        }

        // 批次延迟
        if (i + fetchBatchSize < friendIds.length) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // 渲染剩余的评测
      flushRenderQueue();

      // 隐藏加载状态
      if (this._uiRenderer) {
        this._uiRenderer.hideLoading();
      }

      return reviews;
    },

    /**
     * 将快速模式结果同步到字典缓存
     * 无论是否有现有缓存，都会保存结果
     */
    _syncQuickResultsToDict: function(reviews, appId) {
      try {
        const cache = new ReviewCache();
        // 尝试加载现有缓存，如果没有也没关系
        cache.loadFromCache();

        // 添加新的评测记录
        reviews.forEach(review => {
          cache.addReviewToCache(review.steamId, appId);
        });

        // 保存到缓存
        cache.saveToCache();
        console.log(`🔗 已将 ${reviews.length} 条评测同步到字典缓存`);
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

      // 初始化UI渲染器
      if (!this._uiRenderer) {
        this._uiRenderer = new UIRenderer();
      }
      // 注入样式
      this._uiRenderer.injectStyles();

      const self = this;

      // 立即检测当前页面
      this._pageDetector.detectAndTrigger(
        // onNeedFix: Steam渲染失败，需要FRF自动修复
        (appId) => {
          console.log(`🔧 检测到Steam渲染bug，自动启动FRF修复...`);
          // 隐藏欢迎横幅（开始渲染后不需要了）
          self._uiRenderer.hideWelcomeBanner();
          // 开始渲染
          self.renderUI();
        },
        // onPageReady: 进入好友评测页面立即显示欢迎横幅和按钮
        (appId) => {
          console.log(`🚀 FRF 已就绪，App ID: ${appId}`);
          // 立即显示欢迎横幅
          self._uiRenderer.showWelcomeBanner();
          // 立即添加FRF刷新按钮
          self._uiRenderer.addRefreshButton();
          // 初始化设置面板（会添加设置按钮）
          if (!self._settingsPanel) {
            self._settingsPanel = new SettingsPanel();
            self._settingsPanel.init();
            // 应用保存的设置
            self._settingsPanel.applySavedSettings();
          }
        }
      );

      // 监听页面变化（SPA导航）
      this._pageDetector.watchPageChanges((appId) => {
        console.log(`🔧 页面变化，重新检测...`);
        // 显示欢迎横幅和按钮
        self._uiRenderer.showWelcomeBanner();
        self._uiRenderer.addRefreshButton();
      });

      console.log('👀 FRF 自动检测已启动');
    }
  };

  // 欢迎信息
  console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
  console.log('%c  🚀 FRF v' + Constants.VERSION + ' 已加载', 'color: #47bfff; font-weight: bold; font-size: 16px;');
  console.log('%c  Friend Review Finder', 'color: #47bfff;');
  console.log('%c  智能缓存 + 设置面板', 'color: #e91e63; font-weight: bold;');
  console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
  console.log('');
  console.log('📖 输入 %cFRF.help()%c 查看使用说明', 'color: #ff9800; font-weight: bold;', '');
  console.log('🔧 智能缓存: 首次搜索后自动缓存，下次秒加载');
  console.log('🔄 后台更新: 缓存加载后自动检查数据改动');
  console.log('');

  // 自动启动检测（延迟执行，等待页面加载完成）
  setTimeout(() => {
    window.FRF.startAutoDetect();
  }, 2000);
}
