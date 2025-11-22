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
      console.log('  FRF.refresh()        - 刷新字典缓存');
      console.log('  FRF.clearCache()     - 清除缓存');
      console.log('  FRF.stats()          - 查看缓存统计');
      console.log('');
      console.log('%c⚙️ 其他:', 'color: #9e9e9e;');
      console.log('  FRF.getAppId()       - 获取当前页面游戏ID');
      console.log('  FRF.setDebug(true)   - 开启调试模式');
      console.log('');
      console.log('%c💡 模式对比:', 'color: #2196f3;');
      console.log('  快速模式: 单游戏，最新数据，遍历好友');
      console.log('  字典模式: 多游戏，缓存查询，需先构建');
      console.log('');
      console.log('%c💡 示例:', 'color: #2196f3;');
      console.log('  FRF.quick(413150)    - 快速搜索《星露谷物语》');
      console.log('  FRF.test(413150)     - 字典模式查询《星露谷物语》');
      console.log('');
    }
  };

  // 欢迎信息
  console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
  console.log('%c  🚀 FRF v3.0 已加载', 'color: #47bfff; font-weight: bold; font-size: 16px;');
  console.log('%c  Friend Review Finder', 'color: #47bfff;');
  console.log('%c  双模式架构：快速模式 + 字典模式', 'color: #4caf50; font-weight: bold;');
  console.log('%c========================================', 'color: #47bfff; font-weight: bold;');
  console.log('');
  console.log('📖 输入 %cFRF.help()%c 查看使用说明', 'color: #ff9800; font-weight: bold;', '');
  console.log('🚀 快速模式: %cFRF.quick(appId)%c - 单游戏最新数据', 'color: #ff9800; font-weight: bold;', '');
  console.log('📚 字典模式: %cFRF.test(appId)%c - 多游戏快速查询', 'color: #4caf50; font-weight: bold;', '');
  console.log('');
}
