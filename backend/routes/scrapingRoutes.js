const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const { v4: uuidv4 } = require('uuid');

const { validateRequest, validationSchemas } = require('../middleware/validation');
const { scrapePage, launchBrowser, setupPage } = require('../services/scrapingService');
const { isCriticalError, shouldBreakScraping, updateErrorStats } = require('../services/errorHandlingService');
const { normalizeUrl } = require('../utils/urlUtils');
const { logger } = require('../utils/logger');
const { DIRECTORIES } = require('../config/constants');

const router = express.Router();

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

/**
 * Main scraping endpoint
 */
router.post('/scrape', validateRequest(validationSchemas.scrapeRequest), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { urls, csvData = [], options = {} } = req.validatedData;
    
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
      // Launch browser and setup page
      browser = await launchBrowser();
      const page = await setupPage(browser);
      
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
            
            // Add error if available
            if (scrapeResult.error) {
              result.error = scrapeResult.error;
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
      const outputDir = path.join(__dirname, '..', DIRECTORIES.output);
      
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

/**
 * Scraping status endpoint for real-time updates
 */
router.get('/scraping-status', (req, res) => {
  res.json(globalScrapingStatus);
});

module.exports = router;
