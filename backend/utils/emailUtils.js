const validator = require('validator');
const cheerio = require('cheerio');
const { emailPatterns } = require('../config/patterns');

/**
 * Extract emails from text content using various patterns
 * @param {string} text - Text content to search
 * @returns {Array<string>} Array of found emails
 */
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

/**
 * Extract emails from HTML (e.g., mailto links)
 * @param {string} html - HTML content to search
 * @returns {Array<string>} Array of found emails
 */
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
  } catch (_) {
    // Ignore parsing errors
  }
  
  return Array.from(emails);
}

/**
 * Extract domain from email address
 * @param {string} email - Email address
 * @returns {string|null} Domain or null if invalid
 */
function extractDomainFromEmail(email) {
  try {
    return email.split('@')[1].toLowerCase();
  } catch {
    return null;
  }
}

module.exports = {
  extractEmails,
  extractEmailsFromHtml,
  extractDomainFromEmail
};
