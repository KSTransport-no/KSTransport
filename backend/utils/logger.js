/**
 * Structured logger with environment-based filtering.
 *
 * Levels (in ascending severity): debug, info, warn, error
 *
 * LOG_LEVEL env var controls the minimum level that is emitted.
 *   - production  default: 'info'  (debug suppressed)
 *   - development default: 'debug' (everything shown)
 *
 * All output goes through console.* so Sentry's consoleLoggingIntegration
 * picks it up automatically.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const VALID_LEVELS = Object.keys(LEVELS);

const isProduction = process.env.NODE_ENV === 'production';

let minLevel =
  LEVELS[process.env.LOG_LEVEL] ??
  (isProduction ? LEVELS.warn : LEVELS.debug);

function shouldLog(level) {
  return LEVELS[level] >= minLevel;
}

function getLevel() {
  return VALID_LEVELS.find(k => LEVELS[k] === minLevel) || 'info';
}

function setLevel(level) {
  if (LEVELS[level] === undefined) return false;
  minLevel = LEVELS[level];
  return true;
}

function formatMeta(meta) {
  if (meta === undefined) return '';
  if (meta instanceof Error) {
    return ` ${meta.stack || meta.message}`;
  }
  if (typeof meta === 'object') {
    try { return ` ${JSON.stringify(meta)}`; } catch { return ` [unserializable]`; }
  }
  return ` ${meta}`;
}

const logger = {
  /**
   * Debug-level: verbose diagnostics, suppressed in production by default.
   * @param {string} msg
   * @param {*} [meta]
   */
  debug(msg, meta) {
    if (!shouldLog('debug')) return;
    console.debug(`[DEBUG] ${msg}${formatMeta(meta)}`);
  },

  /**
   * Informational: startup, lifecycle, or noteworthy events.
   * Replaces the old generic .log() method.
   * @param {string} msg
   * @param {*} [meta]
   */
  info(msg, meta) {
    if (!shouldLog('info')) return;
    console.info(`[INFO] ${msg}${formatMeta(meta)}`);
  },

  /**
   * Warning: recoverable issues that deserve attention.
   * @param {string} msg
   * @param {*} [meta]
   */
  warn(msg, meta) {
    if (!shouldLog('warn')) return;
    console.warn(`[WARN] ${msg}${formatMeta(meta)}`);
  },

  /**
   * Error: failures that need investigation.
   * Always emitted regardless of LOG_LEVEL.
   * @param {string} msg
   * @param {*} [meta]
   */
  error(msg, meta) {
    console.error(`[ERROR] ${msg}${formatMeta(meta)}`);
  },

  /** @deprecated Use logger.info() instead. Alias kept for migration. */
  log(msg, meta) {
    this.info(msg, meta);
  },

  /** Get current log level name */
  getLevel,

  /** Set log level at runtime. Returns true if valid. */
  setLevel,

  /** List of valid level names */
  VALID_LEVELS,
};

module.exports = logger;

