/**
 * Logger utility med environment check
 * Logger kun i development, error logger alltid
 */

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // Error logger alltid, men kan utvides med ekstern logging
    console.error(...args);
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

