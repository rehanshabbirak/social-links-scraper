const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { generateUserAgent } = require('../utils/urlUtils');
const { extractEmails, extractEmailsFromHtml } = require('../utils/emailUtils');
const { 
  findContactLikeLinks, 
  detectRegionBlock, 
  extractSocialLinks, 
  extractPhoneNumbers, 
  extractAddresses 
} = require('../utils/contentUtils');
const { logger } = require('../utils/logger');
const { BROWSER_OPTIONS, VIEWPORT, HTTP_HEADERS, SCRAPING_DEFAULTS } = require('../config/constants');

// Configure Puppeteer plugins
puppeteer.use(StealthPlugin());

/**
 * Enhanced page scraping function
 * @param {Object} page - Puppeteer page object
 * @param {string} url - URL to scrape
 * @param {Object} options - Scraping options
 * @returns {Object} Scraping results
 */
async function scrapePage(page, url, options = {}) {
  const {
    maxDepth = SCRAPING_DEFAULTS.maxDepth,
    timeout = SCRAPING_DEFAULTS.timeout,
    followRedirects = SCRAPING_DEFAULTS.followRedirects,
    extractPhoneNumbers = SCRAPING_DEFAULTS.extractPhoneNumbers,
    extractAddresses = SCRAPING_DEFAULTS.extractAddresses,
    smartCrawling = SCRAPING_DEFAULTS.smartCrawling
  } = options;
  
  try {
    // Set page options
    await page.setDefaultNavigationTimeout(timeout);
    await page.setUserAgent(generateUserAgent());
    
    // Navigate to page with retry logic
    let navigationSuccess = false;
    let lastError = null;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: Math.min(timeout, 30000)
        });
        navigationSuccess = true;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          logger.warn(`Navigation attempt ${attempt} failed for ${url} (timeout: 30s), retrying...`);
          await page.waitForTimeout(1000 * attempt);
        }
      }
    }
    
    if (!navigationSuccess) {
      throw lastError;
    }
    
    // Wait for dynamic content
    await page.waitForTimeout(1000);
    
    // Get page content with fallback
    let content, textContent;
    try {
      content = await page.content();
      textContent = await page.evaluate(() => document.body.innerText);
    } catch (error) {
      logger.warn(`Failed to get page content for ${url}, using fallback: ${error.message}`);
      content = await page.evaluate(() => document.documentElement.outerHTML);
      textContent = await page.evaluate(() => document.documentElement.innerText || '');
    }
    
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
      results.phoneNumbers = extractPhoneNumbers(textContent);
    }
    
    // Extract addresses if requested
    if (extractAddresses) {
      results.addresses = extractAddresses(textContent);
    }
    
    // Smart crawling logic
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
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
          await page.waitForTimeout(500);
          
          const linkHtml = await page.content();
          const regionBlockMessage = detectRegionBlock(linkHtml, link);
          if (regionBlockMessage) {
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

/**
 * Launch browser with configured options
 * @returns {Object} Browser instance
 */
async function launchBrowser() {
  return await puppeteer.launch(BROWSER_OPTIONS);
}

/**
 * Setup page with optimizations
 * @param {Object} browser - Browser instance
 * @returns {Object} Configured page
 */
async function setupPage(browser) {
  const page = await browser.newPage();
  
  // Block resources for faster loading
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    const url = request.url();
    
    // Block images, videos, fonts, stylesheets, and other heavy resources
    if (['image', 'media', 'font', 'stylesheet', 'manifest'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });
  
  // Set additional page options
  await page.setViewport(VIEWPORT);
  await page.setExtraHTTPHeaders(HTTP_HEADERS);
  
  // Disable CSS animations and transitions for faster rendering
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
    `
  });
  
  return page;
}

module.exports = {
  scrapePage,
  launchBrowser,
  setupPage
};
