require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const fs = require('fs-extra');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const winston = require('winston');
const Joi = require('joi');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const UserAgent = require('user-agents');
const dns = require('dns').promises;
const net = require('net');

// Configure Puppeteer plugins
puppeteer.use(StealthPlugin());
// Temporarily disabled AdblockerPlugin due to dependency issues
// puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'email-social-scraper' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Ensure directories exist
const outputDir = path.join(__dirname, 'output');
const logsDir = path.join(__dirname, 'logs');

fs.ensureDirSync(outputDir);
fs.ensureDirSync(logsDir);

// Enhanced email regex patterns
const emailPatterns = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Standard email
  /[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+\s*\[dot\]\s*[a-zA-Z]{2,}/g, // test[at]domain[dot]com
  /[a-zA-Z0-9._%+-]+\s*\(at\)\s*[a-zA-Z0-9.-]+\s*\(dot\)\s*[a-zA-Z]{2,}/g, // test(at)domain(dot)com
  /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/g, // test @ domain . com
  /[a-zA-Z0-9._%+-]+\s*\[@\]\s*[a-zA-Z0-9.-]+\s*\[\.\]\s*[a-zA-Z]{2,}/g, // test[@]domain[.]com
  /[a-zA-Z0-9._%+-]+\s*{at}\s*[a-zA-Z0-9.-]+\s*{dot}\s*[a-zA-Z]{2,}/g, // test{at}domain{dot}com
];

// Enhanced social media patterns
const socialPatterns = {
  facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/[a-zA-Z0-9._-]+/gi,
  twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9._-]+/gi,
  linkedin: /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com)\/(?:company\/[a-zA-Z0-9._-]+|in\/[a-zA-Z0-9._-]+)/gi,
  instagram: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com)\/[a-zA-Z0-9._-]+/gi,
  youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:channel\/[a-zA-Z0-9._-]+|c\/[a-zA-Z0-9._-]+|user\/[a-zA-Z0-9._-]+|@[a-zA-Z0-9._-]+)/gi,
  tiktok: /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com)\/@[a-zA-Z0-9._-]+/gi,
  pinterest: /(?:https?:\/\/)?(?:www\.)?(?:pinterest\.com)\/[a-zA-Z0-9._-]+/gi,
  snapchat: /(?:https?:\/\/)?(?:www\.)?(?:snapchat\.com)\/add\/[a-zA-Z0-9._-]+/gi,
  reddit: /(?:https?:\/\/)?(?:www\.)?(?:reddit\.com)\/r\/[a-zA-Z0-9._-]+/gi,
  telegram: /(?:https?:\/\/)?(?:t\.me)\/[a-zA-Z0-9._-]+/gi,
  whatsapp: /(?:https?:\/\/)?(?:wa\.me)\/[0-9]+/gi,
  discord: /(?:https?:\/\/)?(?:discord\.gg|discord\.com)\/[a-zA-Z0-9._-]+/gi,
};

// Validation schemas
const scrapeRequestSchema = Joi.object({
  urls: Joi.array().items(Joi.string().custom((value, helpers) => {
    // Custom URL validation that's more flexible
    try {
      const normalizedUrl = value.startsWith('http') ? value : `https://${value}`;
      new URL(normalizedUrl);
      return value;
    } catch (error) {
      return helpers.error('any.invalid', { message: 'Invalid URL format' });
    }
  })).min(1).max(100).required(),
  csvData: Joi.array().items(Joi.object().pattern(Joi.string(), Joi.any())).optional(),
  options: Joi.object({
    maxDepth: Joi.number().integer().min(0).max(3).default(2),
    timeout: Joi.number().integer().min(5000).max(60000).default(30000),
    followRedirects: Joi.boolean().default(true),
    extractPhoneNumbers: Joi.boolean().default(false),
    extractAddresses: Joi.boolean().default(false),
    smartCrawling: Joi.boolean().default(true)
  }).optional()
});

// Utility functions
function generateUserAgent() {
  const userAgent = new UserAgent();
  return userAgent.toString();
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    logger.warn('Invalid URL provided to normalizeUrl:', url);
    return null;
  }
  
  const trimmed = url.trim();
  if (!trimmed) {
    logger.warn('Empty URL provided to normalizeUrl');
    return null;
  }
  
  if (!trimmed.startsWith('http')) {
    const normalized = `https://${trimmed}`;
    logger.debug(`Normalized URL: ${trimmed} -> ${normalized}`);
    return normalized;
  }
  
  logger.debug(`URL already has protocol: ${trimmed}`);
  return trimmed;
}

function isValidUrl(url) {
  try {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      return false;
    }
    new URL(normalized);
    return true;
  } catch (error) {
    logger.debug(`URL validation failed for ${url}:`, error.message);
    return false;
  }
}



// Enhanced email extraction
function extractEmails(text) {
  const emails = new Set();
  
  emailPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean up the email
        let cleanEmail = match
          .replace(/\s*\[at\]\s*/g, '@')
          .replace(/\s*\[dot\]\s*/g, '.')
          .replace(/\s*\(at\)\s*/g, '@')
          .replace(/\s*\(dot\)\s*/g, '.')
          .replace(/\s*@\s*/g, '@')
          .replace(/\s*\.\s*/g, '.')
          .replace(/\s*\[@\]\s*/g, '@')
          .replace(/\s*\[\.\]\s*/g, '.')
          .replace(/\s*{at}\s*/g, '@')
          .replace(/\s*{dot}\s*/g, '.')
          .trim();
        
        // Validate the cleaned email
        if (validator.isEmail(cleanEmail)) {
          emails.add(cleanEmail.toLowerCase());
        }
      });
    }
  });
  
  return Array.from(emails);
}

// Extract emails from HTML (e.g., mailto links)
function extractEmailsFromHtml(html) {
  const emails = new Set();
  if (!html) return [];
  try {
    const $ = cheerio.load(html);
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const mail = href.replace(/^mailto:/i, '').split('?')[0].trim();
      if (mail && validator.isEmail(mail)) {
        emails.add(mail.toLowerCase());
      }
    });
  } catch (_) {}
  return Array.from(emails);
}

// Resolve relative URLs to absolute
function resolveUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

// Find likely contact/about/support links on a page
function findContactLikeLinks(html, baseUrl) {
  const results = [];
  if (!html) return results;
  try {
    const $ = cheerio.load(html);
    const CONTACT_HINTS = /(contact|about|support|help|customer|reach|get\s*in\s*touch|kontakt)/i;
    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') || '').trim();
      const text = ($(el).text() || '').trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      if (CONTACT_HINTS.test(href) || CONTACT_HINTS.test(text)) {
        const absolute = resolveUrl(baseUrl, href);
        results.push(absolute);
      }
    });
  } catch (_) {}
  // De-duplicate while preserving order
  return Array.from(new Set(results)).slice(0, 5);
}

// Detect Cloudflare/region/IP block pages to provide actionable feedback
function detectRegionBlock(html, currentUrl) {
  if (!html) return null;
  const lower = html.toLowerCase();
  
  // More specific indicators for actual block pages
  const blockIndicators = [
    'sorry, you have been blocked',
    'you are unable to access',
    'attention required! | cloudflare',
    'checking your browser before accessing',
    'please wait while we check your browser',
    'cloudflare ray id',
    'cf-ray',
    'var cf_chl_opt',
    'cloudflare security check',
    'access denied',
    'blocked by cloudflare',
    'cloudflare protection',
    'security check failed',
    'cf-error-details',
    'cf-wrapper cf-header cf-error-overview',
    'blocked_why_headline',
    'blocked_resolve_headline',
    'this website is using a security service',
    'the action you just performed triggered',
    'performance & security by cloudflare',
    'cloudflare ray id:',
    'cf-footer-item',
    'cf-error-footer'
  ];
  
  // Check for actual block page patterns, not just any mention of cloudflare
  const isBlockPage = blockIndicators.some(indicator => {
    if (indicator === 'cloudflare') {
      // Only trigger on cloudflare if it's in a block context
      return lower.includes('cloudflare') && (
        lower.includes('blocked') || 
        lower.includes('access denied') || 
        lower.includes('security check') ||
        lower.includes('attention required') ||
        lower.includes('checking your browser')
      );
    }
    return lower.includes(indicator);
  });
  
  // Additional check for specific Cloudflare block page structure
  const hasCloudflareBlockStructure = (
    lower.includes('cf-error-details') &&
    lower.includes('cf-wrapper cf-header cf-error-overview') &&
    (lower.includes('sorry, you have been blocked') || lower.includes('you are unable to access'))
  );
  
  if (isBlockPage || hasCloudflareBlockStructure) {
    return `🚫 Website blocked by Cloudflare security for ${currentUrl}. This site is not accessible from your current IP/region. Try using a VPN or different network to access this website.`;
  }
  return null;
}

// Enhanced social media extraction
function extractSocialLinks(text, html) {
  const socialLinks = {};
  
  // Extract from text content
  Object.entries(socialPatterns).forEach(([platform, pattern]) => {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      let url = matches[0];
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      socialLinks[platform] = url;
    }
  });
  
  // Extract from HTML for better accuracy
  if (html) {
    try {
      const $ = cheerio.load(html);
      
      // Look for social media links in href attributes
      $('a[href*="facebook"], a[href*="fb.com"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !socialLinks.facebook) {
          socialLinks.facebook = href.startsWith('http') ? href : `https://${href}`;
        }
      });
      
      $('a[href*="twitter"], a[href*="x.com"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !socialLinks.twitter) {
          socialLinks.twitter = href.startsWith('http') ? href : `https://${href}`;
        }
      });
      
      $('a[href*="linkedin"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !socialLinks.linkedin) {
          socialLinks.linkedin = href.startsWith('http') ? href : `https://${href}`;
        }
      });
      
      $('a[href*="instagram"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !socialLinks.instagram) {
          socialLinks.instagram = href.startsWith('http') ? href : `https://${href}`;
        }
      });
      
      $('a[href*="youtube"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !socialLinks.youtube) {
          socialLinks.youtube = href.startsWith('http') ? href : `https://${href}`;
        }
      });
      
      $('a[href*="tiktok"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !socialLinks.tiktok) {
          socialLinks.tiktok = href.startsWith('http') ? href : `https://${href}`;
        }
      });
    } catch (error) {
      logger.warn('Error parsing HTML for social links:', error.message);
    }
  }
  
  return socialLinks;
}

// Enhanced page scraping function
async function scrapePage(page, url, options = {}) {
  const {
    maxDepth = 2,
    timeout = 30000,
    followRedirects = true,
    extractPhoneNumbers = false,
    extractAddresses = false,
    smartCrawling = true
  } = options;
  
  try {
    // Set page options
    await page.setDefaultNavigationTimeout(timeout);
    await page.setUserAgent(generateUserAgent());
    
    // Navigate to page
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: timeout
    });
    
    // Wait for dynamic content
    await page.waitForTimeout(2000);
    
    // Get page content
    const content = await page.content();
    const textContent = await page.evaluate(() => document.body.innerText);
    
    // Extract data
    const emails = new Set([
      ...extractEmails(textContent),
      ...extractEmailsFromHtml(content)
    ]);
    const socialLinks = extractSocialLinks(textContent, content);
    
    let results = {
      emails: Array.from(emails),
      socialLinks: { ...socialLinks },
      phoneNumbers: [],
      addresses: []
    };
    
    // Extract phone numbers if requested
    if (extractPhoneNumbers) {
      const phonePattern = /(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g;
      const phoneMatches = textContent.match(phonePattern);
      if (phoneMatches) {
        results.phoneNumbers = [...new Set(phoneMatches)];
      }
    }
    
    // Extract addresses if requested
    if (extractAddresses) {
      const addressPattern = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Terrace|Ter|Circle|Cir|Square|Sq)/gi;
      const addressMatches = textContent.match(addressPattern);
      if (addressMatches) {
        results.addresses = [...new Set(addressMatches)];
      }
    }
    
    // Smart crawling logic: Skip deep crawling if emails found on homepage (only if smartCrawling is enabled)
    const homepageHasEmails = results.emails.length > 0;
    
    if (maxDepth > 0 && (!homepageHasEmails || !smartCrawling)) {
      logger.info(`No emails found on homepage ${url}, proceeding with deep crawling (depth: ${maxDepth})`);
      
      // Prioritize contact-like links discovered on this page
      const prioritizedLinks = findContactLikeLinks(content, url);
      
      // Fallback to a few general links if none found
      const fallbackLinks = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a[href]');
        return Array.from(anchors, a => a.href)
          .filter(href => href.startsWith('http'))
          .slice(0, 5);
      });
      const links = Array.from(new Set([...
        prioritizedLinks,
        ...fallbackLinks
      ])).slice(0, 8);
      
      // Scrape linked pages
      for (const link of links) {
        try {
          await page.goto(link, { 
            waitUntil: 'networkidle2', 
            timeout: 15000 
          });
          await page.waitForTimeout(1000);
          
          const linkHtml = await page.content();
          const regionBlockMessage = detectRegionBlock(linkHtml, link);
          if (regionBlockMessage) {
            // Record a helpful error and skip this link
            logger.warn(regionBlockMessage);
            if (!results.error) {
              results.error = regionBlockMessage;
            } else if (!results.error.includes('VPN')) {
              results.error += ` | ${regionBlockMessage}`;
            }
            continue;
          }
          const linkText = await page.evaluate(() => document.body.innerText);
          const linkEmails = new Set([
            ...extractEmails(linkText),
            ...extractEmailsFromHtml(linkHtml)
          ]);
          const linkSocialLinks = extractSocialLinks(linkText, linkHtml);
          
          // Merge results
          Array.from(linkEmails).forEach(email => {
            if (!results.emails.includes(email)) {
              results.emails.push(email);
            }
          });
          
          Object.entries(linkSocialLinks).forEach(([platform, url]) => {
            if (!results.socialLinks[platform]) {
              results.socialLinks[platform] = url;
            }
          });
        } catch (error) {
          logger.warn(`Error scraping link ${link}:`, error.message);
        }
      }
    } else if (homepageHasEmails && smartCrawling) {
      logger.info(`Emails found on homepage ${url} (${results.emails.length} emails), skipping deep crawling for efficiency`);
      results.optimizationNote = `Skipped deep crawling - found ${results.emails.length} email(s) on homepage`;
    } else if (!smartCrawling) {
      logger.info(`Smart crawling disabled for ${url}, proceeding with full deep crawling`);
    } else {
      logger.info(`No deep crawling requested for ${url} (maxDepth: ${maxDepth})`);
    }
    
    return results;
  } catch (error) {
    throw new Error(`Failed to scrape ${url}: ${error.message}`);
  }
}

// Error handling configuration
const ERROR_BREAK_CONDITIONS = {
  maxConsecutiveErrors: 5,        // Break after 5 consecutive errors
  maxTotalErrors: 10,             // Break after 10 total errors
  criticalErrorPatterns: [        // Patterns that indicate critical system issues
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'browser has been closed',
    'Target page, context or browser has been closed',
    'Protocol error',
    'Navigation timeout',
    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_NETWORK_CHANGED',
    'net::ERR_CONNECTION_RESET'
  ],
  maxErrorRate: 0.7               // Break if error rate exceeds 70%
};

// Error handling utility functions
function isCriticalError(errorMessage) {
  const message = errorMessage.toLowerCase();
  return ERROR_BREAK_CONDITIONS.criticalErrorPatterns.some(pattern => 
    message.includes(pattern.toLowerCase())
  );
}

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
  if (criticalErrors >= 3) {
    return {
      shouldBreak: true,
      reason: `Too many critical system errors (${criticalErrors})`
    };
  }
  
  return { shouldBreak: false, reason: null };
}

function updateErrorStats(errorStats, error, isSuccess) {
  if (isSuccess) {
    errorStats.consecutiveErrors = 0;
  } else {
    errorStats.consecutiveErrors++;
    errorStats.totalErrors++;
    
    if (isCriticalError(error)) {
      errorStats.criticalErrors++;
    }
  }
  
  return errorStats;
}

// Main scraping endpoint
app.post('/api/scrape', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate request
    const { error, value } = scrapeRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        details: error.details
      });
    }
    
    const { urls, csvData = [], options = {} } = value;
    
    // Ensure csvData is always an array
    const safeCsvData = Array.isArray(csvData) ? csvData : [];
    
    logger.info(`Starting scraping for ${urls.length} URLs`);
    
    // Initialize global scraping status
    globalScrapingStatus = {
      isActive: true,
      currentUrl: null,
      currentIndex: 0,
      totalUrls: urls.length,
      completedUrls: [],
      results: [],
      isComplete: false,
      startTime: Date.now(),
      errorStats: null
    };
    
    let browser;
    const results = [];
    const errorStats = {
      consecutiveErrors: 0,
      totalErrors: 0,
      criticalErrors: 0,
      shouldBreak: false,
      breakReason: null
    };
    
    try {
      // Launch browser with enhanced options
      browser = await puppeteer.launch({
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
          '--disable-renderer-backgrounding'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set additional page options
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      // Process each URL with error handling
      try {
        for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const normalizedUrl = normalizeUrl(url);
        
        // Update global status for current URL
        globalScrapingStatus.currentUrl = url;
        globalScrapingStatus.currentIndex = i;
        
        logger.info(`Scraping ${i + 1}/${urls.length}: ${url}`);
        
        // Check if we should break before processing this URL
        const breakCheck = shouldBreakScraping(errorStats, i, urls.length);
        if (breakCheck.shouldBreak) {
          logger.error(`🛑 Breaking scraping process: ${breakCheck.reason}`);
          errorStats.shouldBreak = true;
          errorStats.breakReason = breakCheck.reason;
          
          // Add remaining URLs as skipped
          for (let j = i; j < urls.length; j++) {
            const skippedResult = {
              website: urls[j],
              emails: [],
              socialLinks: {},
              phoneNumbers: [],
              addresses: [],
              error: `Skipped due to error break condition: ${breakCheck.reason}`,
              skipped: true
            };
            
            if (safeCsvData && safeCsvData[j]) {
              skippedResult.originalData = safeCsvData[j];
            }
            
            results.push(skippedResult);
            
            // Update global status with skipped URL
            globalScrapingStatus.completedUrls.push({
              index: j,
              url: urls[j],
              status: 'skipped',
              emails: [],
              error: `Skipped due to error break condition: ${breakCheck.reason}`,
              duration: 0
            });
          }
          globalScrapingStatus.results = results;
          break;
        }
        
        try {
          const scrapeResult = await scrapePage(page, normalizedUrl, options);
          // Check for region/IP block on the main page as well
          const html = await page.content();
          const regionBlockMessage = detectRegionBlock(html, normalizedUrl);
          if (regionBlockMessage) {
            logger.warn(regionBlockMessage);
          }
          
          const result = {
            website: url,
            emails: scrapeResult.emails,
            socialLinks: scrapeResult.socialLinks,
            phoneNumbers: scrapeResult.phoneNumbers,
            addresses: scrapeResult.addresses
          };
          
          // Add optimization note if available
          if (scrapeResult.optimizationNote) {
            result.optimizationNote = scrapeResult.optimizationNote;
          }
          
          // Add CSV data if available
          if (safeCsvData && safeCsvData[i]) {
            result.originalData = safeCsvData[i];
          }
          
          if (regionBlockMessage) {
            result.error = regionBlockMessage;
          }
          
          results.push(result);
          
          // Update error stats for success
          updateErrorStats(errorStats, null, true);
          
          // Update global status with completed URL
          globalScrapingStatus.completedUrls.push({
            index: i,
            url: url,
            status: 'success',
            emails: scrapeResult.emails,
            duration: Date.now() - (globalScrapingStatus.startTime || Date.now())
          });
          globalScrapingStatus.results = results;
          
          logger.info(`✓ Found ${scrapeResult.emails.length} emails and ${Object.keys(scrapeResult.socialLinks).length} social links`);
          
        } catch (error) {
          logger.error(`✗ Error scraping ${url}:`, error.message);
          
          // Update error stats for failure
          updateErrorStats(errorStats, error.message, false);
          
          const errorResult = {
            website: url,
            emails: [],
            socialLinks: {},
            phoneNumbers: [],
            addresses: [],
            error: error.message,
            isCriticalError: isCriticalError(error.message)
          };
          
          // Add CSV data even for errors
          if (safeCsvData && safeCsvData[i]) {
            errorResult.originalData = safeCsvData[i];
          }
          
          results.push(errorResult);
          
          // Update global status with error URL
          globalScrapingStatus.completedUrls.push({
            index: i,
            url: url,
            status: 'error',
            emails: [],
            error: error.message,
            duration: Date.now() - (globalScrapingStatus.startTime || Date.now())
          });
          globalScrapingStatus.results = results;
          
          // Check if this error should trigger an immediate break
          if (isCriticalError(error.message)) {
            logger.error(`🚨 Critical error detected: ${error.message}`);
            const criticalBreakCheck = shouldBreakScraping(errorStats, i, urls.length);
            if (criticalBreakCheck.shouldBreak) {
              logger.error(`🛑 Breaking due to critical error: ${criticalBreakCheck.reason}`);
              errorStats.shouldBreak = true;
              errorStats.breakReason = criticalBreakCheck.reason;
              
              // Add remaining URLs as skipped
              for (let j = i + 1; j < urls.length; j++) {
                const skippedResult = {
                  website: urls[j],
                  emails: [],
                  socialLinks: {},
                  phoneNumbers: [],
                  addresses: [],
                  error: `Skipped due to critical error: ${criticalBreakCheck.reason}`,
                  skipped: true
                };
                
                if (safeCsvData && safeCsvData[j]) {
                  skippedResult.originalData = safeCsvData[j];
                }
                
                results.push(skippedResult);
                
                // Update global status with skipped URL
                globalScrapingStatus.completedUrls.push({
                  index: j,
                  url: urls[j],
                  status: 'skipped',
                  emails: [],
                  error: `Skipped due to critical error: ${criticalBreakCheck.reason}`,
                  duration: 0
                });
              }
              globalScrapingStatus.results = results;
              break;
            }
          }
        }
        
        // Rate limiting between requests (only if not breaking)
        if (i < urls.length - 1 && !errorStats.shouldBreak) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        }
      } catch (loopError) {
        logger.error('Error in scraping loop:', loopError);
        // Reset global status on loop error
        globalScrapingStatus.isActive = false;
        globalScrapingStatus.isComplete = false;
        globalScrapingStatus.currentUrl = null;
        throw loopError;
      }
      
      // Save results to files
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Save JSON
      const jsonPath = path.join(outputDir, `scraping-results-${timestamp}.json`);
      await fs.writeJson(jsonPath, {
        timestamp: new Date().toISOString(),
        totalUrls: urls.length,
        results
      }, { spaces: 2 });
      
      // Save CSV
      const csvPath = path.join(outputDir, `scraping-results-${timestamp}.csv`);
      
      // Build dynamic CSV headers based on available data
      const baseHeaders = [
        { id: 'website', title: 'Website' },
        { id: 'emails', title: 'Emails' },
        { id: 'facebook', title: 'Facebook' },
        { id: 'twitter', title: 'Twitter' },
        { id: 'linkedin', title: 'LinkedIn' },
        { id: 'instagram', title: 'Instagram' },
        { id: 'youtube', title: 'YouTube' },
        { id: 'tiktok', title: 'TikTok' },
        { id: 'pinterest', title: 'Pinterest' },
        { id: 'snapchat', title: 'Snapchat' },
        { id: 'reddit', title: 'Reddit' },
        { id: 'telegram', title: 'Telegram' },
        { id: 'whatsapp', title: 'WhatsApp' },
        { id: 'discord', title: 'Discord' },
        { id: 'phoneNumbers', title: 'Phone Numbers' },
        { id: 'addresses', title: 'Addresses' },
        { id: 'optimizationNote', title: 'Optimization Note' },
        { id: 'isCriticalError', title: 'Critical Error' },
        { id: 'skipped', title: 'Skipped' },
        { id: 'error', title: 'Error' }
      ];
      
      // Add original CSV columns if available
      const originalColumns = new Set();
      results.forEach(result => {
        if (result.originalData) {
          Object.keys(result.originalData).forEach(key => {
            if (key.toLowerCase() !== 'website' && key.toLowerCase() !== 'url') {
              originalColumns.add(key);
            }
          });
        }
      });
      
      // Create headers with original columns first, then scraping results
      const originalHeaders = Array.from(originalColumns).map(col => ({
        id: `original_${col}`,
        title: col
      }));
      
      const allHeaders = [...originalHeaders, ...baseHeaders];
      
      const csvWriter = createObjectCsvWriter({
        path: csvPath,
        header: allHeaders
      });
      
      const csvData = results.map(result => {
        const baseData = {
          website: result.website,
          emails: result.emails.join('; '),
          facebook: result.socialLinks.facebook || '',
          twitter: result.socialLinks.twitter || '',
          linkedin: result.socialLinks.linkedin || '',
          instagram: result.socialLinks.instagram || '',
          youtube: result.socialLinks.youtube || '',
          tiktok: result.socialLinks.tiktok || '',
          pinterest: result.socialLinks.pinterest || '',
          snapchat: result.socialLinks.snapchat || '',
          reddit: result.socialLinks.reddit || '',
          telegram: result.socialLinks.telegram || '',
          whatsapp: result.socialLinks.whatsapp || '',
          discord: result.socialLinks.discord || '',
          phoneNumbers: result.phoneNumbers.join('; '),
          addresses: result.addresses.join('; '),
          optimizationNote: result.optimizationNote || '',
          isCriticalError: result.isCriticalError ? 'Yes' : 'No',
          skipped: result.skipped ? 'Yes' : 'No',
          error: result.error || ''
        };
        
        // Add original CSV data
        if (result.originalData) {
          Object.keys(result.originalData).forEach(key => {
            if (key.toLowerCase() !== 'website' && key.toLowerCase() !== 'url') {
              baseData[`original_${key}`] = result.originalData[key];
            }
          });
        }
        
        return baseData;
      });
      
      await csvWriter.writeRecords(csvData);
      
      const duration = Date.now() - startTime;
      
      // Calculate final statistics
      const processedUrls = results.length;
      const successfulUrls = results.filter(r => !r.error && !r.skipped).length;
      const errorUrls = results.filter(r => r.error && !r.skipped).length;
      const skippedUrls = results.filter(r => r.skipped).length;
      
      // Update global status to completed
      globalScrapingStatus.isActive = false;
      globalScrapingStatus.isComplete = true;
      globalScrapingStatus.currentUrl = null;
      globalScrapingStatus.errorStats = errorStats;
      globalScrapingStatus.results = results;
      
      logger.info(`Scraping completed in ${duration}ms. Results saved to:\n- ${jsonPath}\n- ${csvPath}`);
      
      // Prepare response message
      let responseMessage = 'Scraping completed successfully';
      if (errorStats.shouldBreak) {
        responseMessage = `Scraping stopped early due to error conditions: ${errorStats.breakReason}`;
      }
      
      res.json({
        success: !errorStats.shouldBreak || successfulUrls > 0,
        message: responseMessage,
        duration: `${duration}ms`,
        statistics: {
          totalUrls: urls.length,
          processedUrls: processedUrls,
          successfulUrls: successfulUrls,
          errorUrls: errorUrls,
          skippedUrls: skippedUrls,
          errorRate: processedUrls > 0 ? ((errorUrls / processedUrls) * 100).toFixed(1) + '%' : '0%',
          consecutiveErrors: errorStats.consecutiveErrors,
          criticalErrors: errorStats.criticalErrors
        },
        errorBreakInfo: errorStats.shouldBreak ? {
          broken: true,
          reason: errorStats.breakReason,
          breakPoint: processedUrls
        } : null,
        results: results,
        files: {
          json: `scraping-results-${timestamp}.json`,
          csv: `scraping-results-${timestamp}.csv`
        }
      });
      
    } catch (error) {
      logger.error('Scraping error:', error);
      
      // Reset global status on error
      globalScrapingStatus.isActive = false;
      globalScrapingStatus.isComplete = false;
      globalScrapingStatus.currentUrl = null;
      
      res.status(500).json({
        success: false,
        message: 'An error occurred during scraping',
        error: error.message
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
  } catch (error) {
    logger.error('Request processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ---------------------------- Email Verification ----------------------------
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','10minutemail.com','guerrillamail.com','temp-mail.org','yopmail.com',
  'trashmail.com','tempmailo.com','getnada.com','sharklasers.com','dispostable.com'
]);


function extractDomainFromEmail(email) {
  try {
    return email.split('@')[1].toLowerCase();
  } catch { return null; }
}

async function resolveMxRecords(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    return mx.sort((a,b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

function smtpConnect(host, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, host);
    let resolved = false;
    const cleanup = (ok, info) => {
      if (resolved) return;
      resolved = true;
      try { socket.destroy(); } catch {}
      resolve({ ok, info });
    };
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {});
    socket.on('data', (buf) => {
      const msg = buf.toString().trim();
      if (/^220\s/i.test(msg)) {
        cleanup(true, 'greeting');
      }
    });
    socket.on('timeout', () => cleanup(false, 'timeout'));
    socket.on('error', () => cleanup(false, 'error'));
    socket.on('end', () => cleanup(false, 'end'));
  });
}

async function verifyEmailBasic(email) {
  const result = {
    email,
    isValidSyntax: false,
    isDisposable: false,
    hasMxRecords: false,
    smtpConnectable: false,
    score: 0,
    status: 'unknown',
    notes: []
  };

  result.isValidSyntax = validator.isEmail(email || '');
  if (!result.isValidSyntax) {
    result.status = 'invalid';
    result.notes.push('Invalid email syntax');
    return result;
  }

  const domain = extractDomainFromEmail(email);
  if (!domain) {
    result.status = 'invalid';
    result.notes.push('Missing domain');
    return result;
  }

  // Role-based mailboxes are treated the same as individual mailboxes

  if (DISPOSABLE_DOMAINS.has(domain)) {
    result.isDisposable = true;
    result.notes.push('Disposable domain');
  }

  const mx = await resolveMxRecords(domain);
  if (mx.length > 0) {
    result.hasMxRecords = true;
    // Try connecting to the best MX quickly
    try {
      const { ok } = await smtpConnect(mx[0].exchange, 4000);
      result.smtpConnectable = !!ok;
      if (ok) result.notes.push(`SMTP reachable at ${mx[0].exchange}`);
    } catch {}
  } else {
    result.notes.push('No MX records');
  }

  // Scoring heuristic
  let score = 0;
  if (result.isValidSyntax) score += 2;
  if (result.hasMxRecords) score += 3;
  if (result.smtpConnectable) score += 2;
  if (result.isDisposable) score -= 3;
  result.score = score;
  if (score >= 5) result.status = 'deliverable';
  else if (score >= 3) result.status = 'risky';
  else result.status = 'undeliverable';

  return result;
}

app.post('/api/verify', async (req, res) => {
  try {
    const { emails } = req.body || {};
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, message: 'emails[] is required' });
    }
    const unique = Array.from(new Set(emails.map(e => String(e || '').trim()).filter(Boolean))).slice(0, 200);
    const start = Date.now();
    const results = [];
    for (const email of unique) {
      try {
        const v = await verifyEmailBasic(email);
        results.push(v);
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        results.push({ email, status: 'error', error: e.message || 'verify error' });
      }
    }
    const duration = Date.now() - start;
    return res.json({ success: true, total: results.length, durationMs: duration, results });
  } catch (error) {
    logger.error('Verification error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
});

// Global scraping status for real-time updates
let globalScrapingStatus = {
  isActive: false,
  currentUrl: null,
  currentIndex: 0,
  totalUrls: 0,
  completedUrls: [],
  results: [],
  isComplete: false,
  startTime: null,
  errorStats: null
};

// Scraping status endpoint for real-time updates
app.get('/api/scraping-status', (req, res) => {
  res.json(globalScrapingStatus);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📁 Output directory: ${outputDir}`);
  logger.info(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n🛑 Shutting down server...');
  process.exit(0);
}); 