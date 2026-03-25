/**
 * Logger utility med environment check
 * Logger kun i development, error logger alltid
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args) => {
    // Error logger alltid, men kan utvides med ekstern logging
    console.error(...args);
  },

  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

module.exports = logger;

