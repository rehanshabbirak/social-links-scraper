const morgan = require('morgan');
const { logger } = require('../utils/logger');

/**
 * Logging middleware configuration
 */
const loggingMiddleware = {
  // Morgan HTTP request logger
  morgan: morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  })
};

module.exports = loggingMiddleware;
