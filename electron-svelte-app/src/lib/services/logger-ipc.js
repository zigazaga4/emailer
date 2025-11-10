/**
 * Logger IPC Service for Renderer Process
 * Sends log messages to main process for storage in SQLite
 */

// @ts-ignore - window.require is available in Electron renderer with nodeIntegration
const { ipcRenderer } = window.require('electron');

/**
 * Log a message
 * @param {string} level - Log level (info, warn, error, debug)
 * @param {string} category - Log category (email, system, database, etc.)
 * @param {string} message - Log message
 * @param {Object} details - Optional details object
 */
async function log(level, category, message, details = null) {
  try {
    await ipcRenderer.invoke('logs:log', level, category, message, details);
  } catch (error) {
    console.error('Failed to send log to main process:', error);
  }
}

/**
 * Log info message
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {Object} details - Optional details object
 */
export function info(category, message, details = null) {
  log('info', category, message, details);
  console.log(`[${category}] ${message}`, details || '');
}

/**
 * Log warning message
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {Object} details - Optional details object
 */
export function warn(category, message, details = null) {
  log('warn', category, message, details);
  console.warn(`[${category}] ${message}`, details || '');
}

/**
 * Log error message
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {Object} details - Optional details object
 */
export function error(category, message, details = null) {
  log('error', category, message, details);
  console.error(`[${category}] ${message}`, details || '');
}

/**
 * Log debug message
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {Object} details - Optional details object
 */
export function debug(category, message, details = null) {
  log('debug', category, message, details);
  console.debug(`[${category}] ${message}`, details || '');
}

export default {
  info,
  warn,
  error,
  debug
};

