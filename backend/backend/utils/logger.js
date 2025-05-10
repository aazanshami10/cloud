// utils/logger.js
// Custom logger utility

/**
 * Custom logger with different log levels
 */
const logger = {
  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  info: (message, data = {}) => {
    if (process.env.NODE_ENV === "test") return;

    console.log(
      `[${new Date().toISOString()}] [INFO] ${message}`,
      Object.keys(data).length ? data : ""
    );
  },

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  warn: (message, data = {}) => {
    if (process.env.NODE_ENV === "test") return;

    console.warn(
      `[${new Date().toISOString()}] [WARN] ${message}`,
      Object.keys(data).length ? data : ""
    );
  },

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error|Object} error - Error object or additional data
   */
  error: (message, error = {}) => {
    if (process.env.NODE_ENV === "test") return;

    console.error(
      `[${new Date().toISOString()}] [ERROR] ${message}`,
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error
    );
  },

  /**
   * Log debug message (only in development)
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== "development") return;

    console.debug(
      `[${new Date().toISOString()}] [DEBUG] ${message}`,
      Object.keys(data).length ? data : ""
    );
  },

  /**
   * Log HTTP request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  request: (req, res) => {
    if (process.env.NODE_ENV === "test") return;

    console.log(
      `[${new Date().toISOString()}] [REQUEST] ${req.method} ${
        req.originalUrl
      } - ${res.statusCode}`
    );
  },
};

module.exports = logger;
