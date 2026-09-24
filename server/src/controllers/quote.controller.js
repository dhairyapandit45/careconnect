/**
 * Quote Controller
 * Handles quote submission, customer inspection, provider listing, withdrawal, and acceptance.
 */

const { sendSuccess } = require('../utils/apiResponse');
const quoteService = require('../services/quote.service');

const createQuote = async (req, res, next) => {
  try {
    const quote = await quoteService.createQuote(req.user._id, req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Quote submitted successfully',
      data: { quote },
    });
  } catch (error) {
    next(error);
  }
};

const listQuotesForRequest = async (req, res, next) => {
  try {
    const quotes = await quoteService.listQuotesForRequest(req.user, req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Quotes for service request retrieved successfully',
      data: { items: quotes },
    });
  } catch (error) {
    next(error);
  }
};

const acceptQuote = async (req, res, next) => {
  try {
    const requestId = req.params.requestId || req.params.id;
    const quoteId = req.params.quoteId || req.params.id;
    const result = await quoteService.acceptQuote(req.user, requestId, quoteId);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Quote accepted successfully. Service request moved to provider selection.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const listProviderQuotes = async (req, res, next) => {
  try {
    const result = await quoteService.listQuotesForProvider(req.user._id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider quotes retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getProviderQuoteById = async (req, res, next) => {
  try {
    const quote = await quoteService.getQuoteForProvider(req.user._id, req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Quote details retrieved successfully',
      data: { quote },
    });
  } catch (error) {
    next(error);
  }
};

const withdrawQuote = async (req, res, next) => {
  try {
    const quote = await quoteService.withdrawQuote(req.user._id, req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Quote withdrawn successfully',
      data: { quote },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuote,
  listQuotesForRequest,
  acceptQuote,
  listProviderQuotes,
  getProviderQuoteById,
  withdrawQuote,
};
