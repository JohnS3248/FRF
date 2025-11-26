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

    // 配置参数（已优化：基于限流研究）
    this.batchSize = 30;        // 每批并发数
    this.delay = 50;            // 批次间延迟（ms）
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
   * @param {number} requestStartTime - 首次请求时间戳（内部使用）
   * @returns {Promise<Object|null>} 评测数据或 null
   */
  async checkFriendReview(steamId, returnRaw = false, requestStartTime = null) {
    const url = `https://steamcommunity.com/profiles/${steamId}/recommended/${this.appId}/`;
    const startTime = Date.now();
    const retryDelay = 10000;    // 重试等待时间（10秒）
    const maxRetryDuration = 60000; // 最大重试时长（1分钟）

    // 记录首次请求时间
    if (requestStartTime === null) {
      requestStartTime = startTime;
    }

    try {
      const response = await fetch(url, {
        credentials: 'include',
        redirect: 'follow'
      });

      const elapsed = Date.now() - startTime;

      // 429 限流处理：无限重试，最多1分钟
      if (response.status === 429) {
        const totalElapsed = Date.now() - requestStartTime;
        if (totalElapsed < maxRetryDuration) {
          if (this.debugMode) {
            console.log(`[DEBUG] ${steamId} | 429 限流，等待 ${retryDelay/1000}s 后重试 (已用时 ${Math.round(totalElapsed/1000)}s)`);
          }
          await this.sleep(retryDelay);
          return this.checkFriendReview(steamId, returnRaw, requestStartTime);
        } else {
          if (this.debugMode) {
            console.log(`[DEBUG] ${steamId} | 429 限流，已超过最大重试时长 ${maxRetryDuration/1000}s`);
          }
          return null;
        }
      }

      if (!response.ok) {
        if (this.debugMode) {
          console.log(`[DEBUG] ${steamId} | not ok (${response.status}) | ${elapsed}ms`);
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
