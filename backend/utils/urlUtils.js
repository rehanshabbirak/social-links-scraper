const { logger } = require('./logger');
const validator = require('validator');

/**
 * Generate a random user agent
 * @returns {string} Random user agent string
 */
function generateUserAgent() {
  const UserAgent = require('user-agents');
  const userAgent = new UserAgent();
  return userAgent.toString();
}

/**
 * Normalize URL by adding protocol if missing
 * @param {string} url - URL to normalize
 * @returns {string|null} Normalized URL or null if invalid
 */
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

/**
 * Validate if URL is properly formatted
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
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

/**
 * Resolve relative URLs to absolute
 * @param {string} baseUrl - Base URL
 * @param {string} href - Relative URL
 * @returns {string} Absolute URL
 */
function resolveUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

module.exports = {
  generateUserAgent,
  normalizeUrl,
  isValidUrl,
  resolveUrl
};
