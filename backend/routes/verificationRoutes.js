const express = require('express');
const { verifyEmails } = require('../services/emailVerificationService');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * Email verification endpoint
 */
router.post('/verify', async (req, res) => {
  try {
    const { emails } = req.body || {};
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'emails[] is required' 
      });
    }
    
    const start = Date.now();
    const results = await verifyEmails(emails);
    const duration = Date.now() - start;
    
    return res.json({ 
      success: true, 
      total: results.length, 
      durationMs: duration, 
      results 
    });
  } catch (error) {
    logger.error('Verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Verification failed', 
      error: error.message 
    });
  }
});

module.exports = router;
