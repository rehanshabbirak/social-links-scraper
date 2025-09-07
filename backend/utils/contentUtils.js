const cheerio = require('cheerio');
const { socialPatterns, contactHints, cloudflareBlockIndicators, phonePattern, addressPattern } = require('../config/patterns');
const { resolveUrl } = require('./urlUtils');
const { logger } = require('./logger');

/**
 * Find likely contact/about/support links on a page
 * @param {string} html - HTML content
 * @param {string} baseUrl - Base URL for resolving relative links
 * @returns {Array<string>} Array of contact-like URLs
 */
function findContactLikeLinks(html, baseUrl) {
  const results = [];
  if (!html) return results;
  
  try {
    const $ = cheerio.load(html);
    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') || '').trim();
      const text = ($(el).text() || '').trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      if (contactHints.test(href) || contactHints.test(text)) {
        const absolute = resolveUrl(baseUrl, href);
        results.push(absolute);
      }
    });
  } catch (_) {
    // Ignore parsing errors
  }
  
  // De-duplicate while preserving order
  return Array.from(new Set(results)).slice(0, 5);
}

/**
 * Detect Cloudflare/region/IP block pages
 * @param {string} html - HTML content
 * @param {string} currentUrl - Current URL being checked
 * @returns {string|null} Block message or null if not blocked
 */
function detectRegionBlock(html, currentUrl) {
  if (!html) return null;
  const lower = html.toLowerCase();
  
  // Check for actual block page patterns
  const isBlockPage = cloudflareBlockIndicators.some(indicator => {
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

/**
 * Extract social media links from text and HTML
 * @param {string} text - Text content
 * @param {string} html - HTML content
 * @returns {Object} Object with social media links
 */
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

/**
 * Extract phone numbers from text
 * @param {string} text - Text content
 * @returns {Array<string>} Array of phone numbers
 */
function extractPhoneNumbers(text) {
  const phoneMatches = text.match(phonePattern);
  return phoneMatches ? [...new Set(phoneMatches)] : [];
}

/**
 * Extract addresses from text
 * @param {string} text - Text content
 * @returns {Array<string>} Array of addresses
 */
function extractAddresses(text) {
  const addressMatches = text.match(addressPattern);
  return addressMatches ? [...new Set(addressMatches)] : [];
}

module.exports = {
  findContactLikeLinks,
  detectRegionBlock,
  extractSocialLinks,
  extractPhoneNumbers,
  extractAddresses
};
