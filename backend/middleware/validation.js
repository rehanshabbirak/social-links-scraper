const Joi = require('joi');

/**
 * Validation schemas
 */
const validationSchemas = {
  // Scrape request validation schema
  scrapeRequest: Joi.object({
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
  }),

  // Email verification request validation schema
  emailVerification: Joi.object({
    emails: Joi.array().items(Joi.string().email()).min(1).max(200).required()
  })
};

/**
 * Validation middleware factory
 * @param {Object} schema - Joi schema to validate against
 * @returns {Function} Express middleware function
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        details: error.details
      });
    }
    req.validatedData = value;
    next();
  };
}

module.exports = {
  validationSchemas,
  validateRequest
};
