const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { RATE_LIMIT, FRONTEND_URL } = require('../config/constants');

/**
 * Security middleware configuration
 */
const securityMiddleware = {
  // Helmet configuration for security headers
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),

  // CORS configuration
  cors: cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }),

  // Rate limiting
  rateLimit: rateLimit({
    windowMs: RATE_LIMIT.windowMs,
    max: RATE_LIMIT.max,
    message: RATE_LIMIT.message,
    standardHeaders: true,
    legacyHeaders: false,
  })
};

module.exports = securityMiddleware;
