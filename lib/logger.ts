const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: any[]) => isDev && console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) => isDev && console.log('[DEBUG]', ...args),
};
