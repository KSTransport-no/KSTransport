/**
 * Structured logger with environment-based filtering.
 *
 * Levels: debug, info, warn, error
 * In production, debug is suppressed by default.
 * Errors are always emitted.
 *
 * Admins can override the level at runtime via setLevel() which
 * persists to localStorage so the setting survives page reloads.
 */

const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const VALID_LEVELS = Object.keys(LEVELS);

const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.NEXT_PUBLIC_NODE_ENV === 'production';

const defaultLevel = isProduction ? LEVELS.warn : LEVELS.debug;

function getStoredLevel(): number {
  if (typeof window === 'undefined') return defaultLevel;
  try {
    const stored = localStorage.getItem('ks_log_level');
    if (stored && LEVELS[stored] !== undefined) return LEVELS[stored];
  } catch { /* SSR or storage blocked */ }
  return defaultLevel;
}

let minLevel = getStoredLevel();

function shouldLog(level: string): boolean {
  return (LEVELS[level] ?? 0) >= minLevel;
}

export const logger = {
  debug(msg: string, meta?: unknown) {
    if (!shouldLog('debug')) return;
    console.debug(`[DEBUG] ${msg}`, ...(meta !== undefined ? [meta] : []));
  },

  info(msg: string, meta?: unknown) {
    if (!shouldLog('info')) return;
    console.info(`[INFO] ${msg}`, ...(meta !== undefined ? [meta] : []));
  },

  warn(msg: string, meta?: unknown) {
    if (!shouldLog('warn')) return;
    console.warn(`[WARN] ${msg}`, ...(meta !== undefined ? [meta] : []));
  },

  error(msg: string, meta?: unknown) {
    console.error(`[ERROR] ${msg}`, ...(meta !== undefined ? [meta] : []));
  },

  /** @deprecated Use info/debug instead */
  log(msg: string, meta?: unknown) {
    this.info(msg, meta);
  },

  /** Get current log level name */
  getLevel(): string {
    return VALID_LEVELS.find(k => LEVELS[k] === minLevel) || 'info';
  },

  /** Set log level at runtime. Persists to localStorage. */
  setLevel(level: string): boolean {
    if (LEVELS[level] === undefined) return false;
    minLevel = LEVELS[level];
    try { localStorage.setItem('ks_log_level', level); } catch { /* ignore */ }
    return true;
  },

  VALID_LEVELS,
};

