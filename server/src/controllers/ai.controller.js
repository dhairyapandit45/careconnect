/**
 * AI Controller
 * Handles incoming HTTP requests for category classification and provider recommendations.
 */

const aiService = require('../services/ai.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Classify a service request into a category with explainable confidence
 * POST /api/v1/ai/classify
 */
const classifyRequest = async (req, res, next) => {
  try {
    const { title, description, text } = req.body;
    const result = await aiService.classifyRequest({ title, description, text });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Service category classified successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Match and rank verified active providers for a service request
 * POST /api/v1/ai/match-providers
 */
const matchProviders = async (req, res, next) => {
  try {
    const { categoryId, city, preferredDate, urgency, limit } = req.body;
    const result = await aiService.matchProviders({
      categoryId,
      city,
      preferredDate,
      urgency,
      limit,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider matches calculated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  classifyRequest,
  matchProviders,
};
