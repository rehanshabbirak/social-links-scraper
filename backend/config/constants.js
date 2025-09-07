// Application constants
module.exports = {
  PORT: process.env.PORT || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Rate limiting
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.'
    }
  },
  
  // Request limits
  REQUEST_LIMITS: {
    jsonLimit: '50mb',
    urlencodedLimit: '50mb'
  },
  
  // Scraping defaults
  SCRAPING_DEFAULTS: {
    maxDepth: 2,
    timeout: 30000,
    followRedirects: true,
    extractPhoneNumbers: false,
    extractAddresses: false,
    smartCrawling: true
  },
  
  // Browser options
  BROWSER_OPTIONS: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-images',
      '--disable-plugins',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--disable-logging',
      '--disable-permissions-api',
      '--disable-presentation-api',
      '--disable-print-preview',
      '--disable-speech-api',
      '--disable-file-system',
      '--disable-notifications',
      '--disable-webgl',
      '--disable-webgl2',
      '--disable-3d-apis',
      '--disable-accelerated-video-decode',
      '--disable-accelerated-mjpeg-decode',
      '--disable-accelerated-video-encode',
      '--disable-gpu-sandbox',
      '--disable-software-rasterizer',
      '--disable-background-networking',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-domain-reliability',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-sync-preferences',
      '--disable-web-resources',
      '--disable-xss-auditor',
      '--disable-features=VizDisplayCompositor',
      '--aggressive-cache-discard',
      '--memory-pressure-off',
      '--max_old_space_size=4096'
    ]
  },
  
  // Viewport settings
  VIEWPORT: {
    width: 1920,
    height: 1080
  },
  
  // HTTP headers
  HTTP_HEADERS: {
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  },
  
  // Directories
  DIRECTORIES: {
    output: 'output',
    logs: 'logs'
  }
};
