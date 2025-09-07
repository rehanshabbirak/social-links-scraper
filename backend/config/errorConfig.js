// Error handling configuration
module.exports = {
  ERROR_BREAK_CONDITIONS: {
    maxConsecutiveErrors: 10,       // Break after 10 consecutive errors
    maxTotalErrors: 25,             // Break after 25 total errors
    criticalErrorPatterns: [        // Only truly critical system issues
      'browser has been closed',
      'Target page, context or browser has been closed',
      'Protocol error',
      'net::ERR_INTERNET_DISCONNECTED',
      'net::ERR_NETWORK_CHANGED',
      'net::ERR_CONNECTION_RESET',
      'Cannot access',
      'ReferenceError',
      'TypeError',
      'SyntaxError'
    ],
    maxErrorRate: 0.8,              // Break if error rate exceeds 80%
    maxCriticalErrors: 5            // Break after 5 critical system errors
  },

  // Non-critical error patterns (these won't trigger critical error handling)
  nonCriticalPatterns: [
    'cloudflare',
    'blocked',
    '403',
    '404',
    '500',
    '502',
    '503',
    '504',
    'timeout',
    'econnrefused',
    'enotfound',
    'etimedout',
    'navigation timeout',
    'page crashed',
    'net::err_',
    'this website is using a security service',
    'access denied',
    'forbidden',
    'not found',
    'server error',
    'service unavailable',
    'gateway timeout',
    'too many requests',
    'rate limit'
  ],

  // Disposable email domains
  DISPOSABLE_DOMAINS: new Set([
    'mailinator.com',
    '10minutemail.com',
    'guerrillamail.com',
    'temp-mail.org',
    'yopmail.com',
    'trashmail.com',
    'tempmailo.com',
    'getnada.com',
    'sharklasers.com',
    'dispostable.com'
  ])
};
