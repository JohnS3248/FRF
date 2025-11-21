/**
 * 固定延迟限流器 - v2.0 正式版
 *
 * 经过多轮测试验证的最优配置：
 * - BATCH_SIZE = 3, DELAY = 300ms
 * - 固定参数，不做自适应调整
 * - 接受个别慢响应（数据量大导致，无法避免）
 */

class Throttler {
  constructor() {
    // 最优配置（经实测验证）
    this.batchSize = 3;           // 每批处理 3 个好友
    this.delay = 300;             // 批次间延迟 300ms

    this.logger = new Logger('Throttler');
  }

  /**
   * 获取批次大小
   * @returns {number} 批次大小
   */
  getBatchSize() {
    return this.batchSize;
  }

  /**
   * 获取延迟时间
   * @returns {number} 延迟时间（毫秒）
   */
  getDelay() {
    return this.delay;
  }
}

// 暴露到全局
if (typeof window !== 'undefined') {
  window.FRF_Throttler = Throttler;
}
