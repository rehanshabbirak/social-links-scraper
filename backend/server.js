require('dotenv').config();
const express = require('express');
const compression = require('compression');
const fs = require('fs-extra');
const path = require('path');

// Import configurations
const { PORT, REQUEST_LIMITS, DIRECTORIES } = require('./config/constants');

// Import middleware
const securityMiddleware = require('./middleware/security');
const loggingMiddleware = require('./middleware/logging');

// Import routes
const scrapingRoutes = require('./routes/scrapingRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const statusRoutes = require('./routes/statusRoutes');

// Import utilities
const { logger } = require('./utils/logger');

const app = express();

// Security middleware
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.cors);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(loggingMiddleware.morgan);

// Body parsing middleware
app.use(express.json({ limit: REQUEST_LIMITS.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_LIMITS.urlencodedLimit }));

// Rate limiting
app.use('/api/', securityMiddleware.rateLimit);

// Ensure directories exist
const outputDir = path.join(__dirname, DIRECTORIES.output);
const logsDir = path.join(__dirname, DIRECTORIES.logs);

fs.ensureDirSync(outputDir);
fs.ensureDirSync(logsDir);

// API Routes
app.use('/api', scrapingRoutes);
app.use('/api', verificationRoutes);
app.use('/api', statusRoutes);

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
