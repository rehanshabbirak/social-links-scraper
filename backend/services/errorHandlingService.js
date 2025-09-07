const { ERROR_BREAK_CONDITIONS, nonCriticalPatterns } = require('../config/errorConfig');
const { logger } = require('../utils/logger');

/**
 * Check if an error is critical (system-level issue)
 * @param {string} errorMessage - Error message to check
 * @returns {boolean} True if critical error
 */
function isCriticalError(errorMessage) {
  const message = errorMessage.toLowerCase();
  
  // First check if it's a known non-critical website error
  if (nonCriticalPatterns.some(pattern => message.includes(pattern))) {
    return false;
  }
  
  // Only treat as critical if it matches our critical patterns
  return ERROR_BREAK_CONDITIONS.criticalErrorPatterns.some(pattern => 
    message.includes(pattern.toLowerCase())
  );
}

/**
 * Determine if scraping should be stopped based on error statistics
 * @param {Object} errorStats - Current error statistics
 * @param {number} currentIndex - Current URL index
 * @param {number} totalUrls - Total number of URLs
 * @returns {Object} Break decision with reason
 */
function shouldBreakScraping(errorStats, currentIndex, totalUrls) {
  const { consecutiveErrors, totalErrors, criticalErrors } = errorStats;
  const errorRate = currentIndex > 0 ? totalErrors / (currentIndex + 1) : 0;
  
  // Check consecutive errors
  if (consecutiveErrors >= ERROR_BREAK_CONDITIONS.maxConsecutiveErrors) {
    return {
      shouldBreak: true,
      reason: `Too many consecutive errors (${consecutiveErrors})`
    };
  }
  
  // Check total errors
  if (totalErrors >= ERROR_BREAK_CONDITIONS.maxTotalErrors) {
    return {
      shouldBreak: true,
      reason: `Too many total errors (${totalErrors})`
    };
  }
  
  // Check error rate
  if (errorRate >= ERROR_BREAK_CONDITIONS.maxErrorRate && currentIndex >= 5) {
    return {
      shouldBreak: true,
      reason: `Error rate too high (${(errorRate * 100).toFixed(1)}%)`
    };
  }
  
  // Check critical errors
  if (criticalErrors >= ERROR_BREAK_CONDITIONS.maxCriticalErrors) {
    return {
      shouldBreak: true,
      reason: `Too many critical system errors (${criticalErrors})`
    };
  }
  
  return { shouldBreak: false, reason: null };
}

/**
 * Update error statistics based on success/failure
 * @param {Object} errorStats - Current error statistics
 * @param {string} error - Error message (null for success)
 * @param {boolean} isSuccess - Whether the operation was successful
 * @returns {Object} Updated error statistics
 */
function updateErrorStats(errorStats, error, isSuccess) {
  if (isSuccess) {
    errorStats.consecutiveErrors = 0;
    errorStats.successCount = (errorStats.successCount || 0) + 1;
    
    // Reset critical errors after 5 successful scrapes
    if (errorStats.successCount >= 5) {
      errorStats.criticalErrors = 0;
      errorStats.successCount = 0;
      logger.info('Error stats reset after 5 successful scrapes');
    }
  } else {
    errorStats.consecutiveErrors++;
    errorStats.totalErrors++;
    
    const isCritical = isCriticalError(error);
    if (isCritical) {
      errorStats.criticalErrors++;
      logger.warn(`Critical error detected: ${error}`, {
        criticalErrors: errorStats.criticalErrors,
        totalErrors: errorStats.totalErrors,
        consecutiveErrors: errorStats.consecutiveErrors
      });
    } else {
      logger.info(`Non-critical error: ${error}`, {
        criticalErrors: errorStats.criticalErrors,
        totalErrors: errorStats.totalErrors,
        consecutiveErrors: errorStats.consecutiveErrors
      });
    }
  }
  
  return errorStats;
}

module.exports = {
  isCriticalError,
  shouldBreakScraping,
  updateErrorStats
};
