const dns = require('dns').promises;
const net = require('net');
const validator = require('validator');
const { DISPOSABLE_DOMAINS } = require('../config/errorConfig');
const { extractDomainFromEmail } = require('../utils/emailUtils');

/**
 * Resolve MX records for a domain
 * @param {string} domain - Domain to check
 * @returns {Array} Sorted MX records
 */
async function resolveMxRecords(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    return mx.sort((a, b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

/**
 * Test SMTP connection to a host
 * @param {string} host - SMTP host
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Object} Connection result
 */
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

/**
 * Verify email address with basic checks
 * @param {string} email - Email to verify
 * @returns {Object} Verification result
 */
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

/**
 * Verify multiple email addresses
 * @param {Array<string>} emails - Array of emails to verify
 * @returns {Array<Object>} Array of verification results
 */
async function verifyEmails(emails) {
  const unique = Array.from(new Set(emails.map(e => String(e || '').trim()).filter(Boolean))).slice(0, 200);
  const results = [];
  
  for (const email of unique) {
    try {
      const verification = await verifyEmailBasic(email);
      results.push(verification);
      await new Promise(r => setTimeout(r, 50)); // Rate limiting
    } catch (e) {
      results.push({ 
        email, 
        status: 'error', 
        error: e.message || 'verify error' 
      });
    }
  }
  
  return results;
}

module.exports = {
  verifyEmailBasic,
  verifyEmails,
  resolveMxRecords,
  smtpConnect
};
