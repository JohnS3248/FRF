/**
 * 日志系统 - 新架构
 * 支持分级日志、性能追踪、彩色输出
 */

class Logger {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.logLevel = Constants.DEBUG_MODE ? Constants.LOG_LEVELS.DEBUG : Constants.LOG_LEVELS.INFO;

    // 彩色输出配置
    this.colors = {
      DEBUG: '#999',
      INFO: '#47bfff',
      WARN: '#ff9800',
      ERROR: '#f44336'
    };
  }

  setLevel(level) {
    this.logLevel = Constants.LOG_LEVELS[level] || Constants.LOG_LEVELS.INFO;
  }

  shouldLog(level) {
    return Constants.LOG_LEVELS[level] <= this.logLevel;
  }

  formatPrefix(level) {
    return `[FRF:${this.moduleName}][${level}]`;
  }

  /**
   * 彩色日志输出
   */
  colorLog(level, message, data = null) {
    const color = this.colors[level] || '#999';
    const prefix = this.formatPrefix(level);

    if (data) {
      console.log(`%c${prefix}`, `color: ${color}; font-weight: bold;`, message, data);
    } else {
      console.log(`%c${prefix}`, `color: ${color}; font-weight: bold;`, message);
    }
  }

  debug(message, data = null) {
    if (!this.shouldLog('DEBUG')) return;
    this.colorLog('DEBUG', message, data);
  }

  info(message, data = null) {
    if (!this.shouldLog('INFO')) return;
    this.colorLog('INFO', message, data);
  }

  warn(message, data = null) {
    if (!this.shouldLog('WARN')) return;
    this.colorLog('WARN', message, data);
  }

  error(message, error = null) {
    if (!this.shouldLog('ERROR')) return;
    this.colorLog('ERROR', message, error);
  }

  /**
   * 性能追踪
   */
  time(label) {
    console.time(`${this.formatPrefix('PERF')} ${label}`);
  }

  timeEnd(label) {
    console.timeEnd(`${this.formatPrefix('PERF')} ${label}`);
  }

  /**
   * 表格输出
   */
  table(data) {
    if (!this.shouldLog('DEBUG')) return;
    console.log(this.formatPrefix('DEBUG'), '数据表格：');
    console.table(data);
  }

  /**
   * 进度输出
   */
  progress(current, total, message = '') {
    const percent = ((current / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
    this.info(`${message} [${bar}] ${percent}% (${current}/${total})`);
  }
}

if (typeof window !== 'undefined') {
  window.FRF_Logger = Logger;
}
