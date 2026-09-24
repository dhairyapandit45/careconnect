/**
 * Quote Business Logic Service
 * Enforces quote lifecycle management, deterministic eligibility checks,
 * duplicate prevention, ownership boundaries, and finite state machine transitions.
 */

const Quote = require('../models/Quote');
const ServiceRequest = require('../models/ServiceRequest');
const ProviderProfile = require('../models/ProviderProfile');
const User = require('../models/User');
const { ApiError } = require('../utils/apiError');
const {
  QUOTE_STATUS,
  SERVICE_REQUEST_STATUS,
  USER_STATUS,
  PROVIDER_VERIFICATION_STATUS,
  isValidTransition,
  VALID_QUOTE_TRANSITIONS,
} = require('../constants/status');
const { ROLES } = require('../constants/roles');
const { checkProviderEligibility } = require('./providerEligibility.service');

/**
 * Creates a new quote submitted by an authenticated, verified, eligible provider
 * @param {string} userId - Authenticated provider User ID
 * @param {string} requestId - Target ServiceRequest ID
 * @param {Object} data - Quote fields
 */
const createQuote = async (userId, requestId, data) => {
  // 1. Fetch provider user and profile
  const [user, profile, serviceRequest] = await Promise.all([
    User.findById(userId),
    ProviderProfile.findOne({ user: userId }),
    ServiceRequest.findById(requestId).populate('category'),
  ]);

  if (!serviceRequest) {
    throw ApiError.notFound('Service request not found');
  }

  // 2. Validate provider authentication & active account
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('Your provider account must be active to submit quotes');
  }

  // 3. Validate provider profile and verification status
  if (!profile || profile.verificationStatus !== PROVIDER_VERIFICATION_STATUS.APPROVED) {
    throw ApiError.forbidden('Your provider profile must be verified and approved before submitting quotes');
  }

  // 4. Validate request status allows quotes
  const quoteAllowedStatuses = [
    SERVICE_REQUEST_STATUS.SUBMITTED,
    SERVICE_REQUEST_STATUS.MATCHING,
    SERVICE_REQUEST_STATUS.QUOTING,
  ];
  if (!quoteAllowedStatuses.includes(serviceRequest.status)) {
    throw ApiError.badRequest(
      `Cannot submit quotes for service request with status "${serviceRequest.status}"`
    );
  }

  // 5. Deterministic eligibility check
  const isEligible = checkProviderEligibility(profile, user, serviceRequest);
  if (!isEligible) {
    throw ApiError.forbidden('You are not eligible to quote on this request (category or service area mismatch)');
  }

  // 6. Prevent duplicate active quotes from the same provider for this request
  const existingActiveQuote = await Quote.findOne({
    serviceRequest: requestId,
    provider: userId,
    status: {
      $in: [QUOTE_STATUS.SUBMITTED, QUOTE_STATUS.VIEWED, QUOTE_STATUS.ACCEPTED],
    },
  });

  if (existingActiveQuote) {
    throw new ApiError(
      409,
      'You have already submitted an active quote for this service request',
      'DUPLICATE_ACTIVE_QUOTE'
    );
  }

  // 7. Parse and sanitize payload
  const amount = Number(data.amount !== undefined ? data.amount : data.estimatedPrice);
  const estimatedDuration = Number(
    data.estimatedDuration !== undefined ? data.estimatedDuration : data.estimatedDurationHours
  );
  const description = (data.description || data.message || '').trim();
  const validUntil = new Date(data.validUntil || data.expiresAt);

  if (amount <= 0 || isNaN(amount)) {
    throw ApiError.badRequest('Quote amount must be greater than zero');
  }

  if (estimatedDuration <= 0 || isNaN(estimatedDuration)) {
    throw ApiError.badRequest('Estimated duration must be positive');
  }

  if (!description || description.length < 5) {
    throw ApiError.badRequest('Description must be at least 5 characters long');
  }

  if (isNaN(validUntil.getTime()) || validUntil <= new Date()) {
    throw ApiError.badRequest('validUntil date must be in the future');
  }

  // 8. Create Quote document
  const quote = await Quote.create({
    serviceRequest: requestId,
    provider: userId,
    providerProfile: profile._id,
    amount,
    currency: data.currency || 'INR',
    estimatedDuration,
    description,
    validUntil,
    status: QUOTE_STATUS.SUBMITTED,
  });

  // 9. Transition request status to QUOTING if currently SUBMITTED or MATCHING
  if (
    serviceRequest.status === SERVICE_REQUEST_STATUS.SUBMITTED ||
    serviceRequest.status === SERVICE_REQUEST_STATUS.MATCHING
  ) {
    serviceRequest.status = SERVICE_REQUEST_STATUS.QUOTING;
    await serviceRequest.save();
  }

  const populated = await Quote.findById(quote._id)
    .populate('provider', 'name')
    .populate(
      'providerProfile',
      'businessName description skills experienceYears rating reviewCount'
    );

  return populated;
};

/**
 * Retrieves quotes for a service request (Accessible only to the customer owner or platform staff)
 * Marks unviewed quotes as VIEWED.
 * @param {Object} user - Authenticated user principal
 * @param {string} requestId
 */
const listQuotesForRequest = async (user, requestId) => {
  const serviceRequest = await ServiceRequest.findById(requestId);
  if (!serviceRequest) {
    throw ApiError.notFound('Service request not found');
  }

  // Customers can ONLY view quotes for requests they own
  if (user.role === ROLES.CUSTOMER && !serviceRequest.customer.equals(user._id)) {
    throw ApiError.forbidden('Access denied: You do not own this service request');
  }

  // Non-staff, non-customer cannot access quotes pool
  if (user.role === ROLES.SERVICE_PROVIDER) {
    throw ApiError.forbidden('Service providers cannot view competitive quotes for customer requests');
  }

  const quotes = await Quote.find({ serviceRequest: requestId })
    .populate('provider', 'name')
    .populate(
      'providerProfile',
      'businessName description skills experienceYears rating reviewCount'
    )
    .sort({ createdAt: -1 });

  // Mark SUBMITTED quotes as VIEWED when customer inspects them
  if (user.role === ROLES.CUSTOMER) {
    const unviewedQuoteIds = quotes
      .filter((q) => q.status === QUOTE_STATUS.SUBMITTED)
      .map((q) => q._id);

    if (unviewedQuoteIds.length > 0) {
      await Quote.updateMany(
        { _id: { $in: unviewedQuoteIds } },
        { status: QUOTE_STATUS.VIEWED }
      );
      // Update in-memory objects
      quotes.forEach((q) => {
        if (q.status === QUOTE_STATUS.SUBMITTED) {
          q.status = QUOTE_STATUS.VIEWED;
        }
      });
    }
  }

  // Format quotes with safe provider summaries (excluding sensitive docs and internal notes)
  const items = quotes.map((q) => ({
    _id: q._id,
    serviceRequest: q.serviceRequest,
    provider: {
      _id: q.provider?._id,
      name: q.provider?.name,
    },
    providerProfile: q.providerProfile
      ? {
          _id: q.providerProfile._id,
          businessName: q.providerProfile.businessName,
          description: q.providerProfile.description,
          skills: q.providerProfile.skills,
          experienceYears: q.providerProfile.experienceYears,
          rating: q.providerProfile.rating,
          reviewCount: q.providerProfile.reviewCount,
        }
      : null,
    amount: q.amount,
    currency: q.currency,
    estimatedDuration: q.estimatedDuration,
    description: q.description,
    status: q.status,
    validUntil: q.validUntil,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  }));

  return items;
};

/**
 * Lists all quotes submitted by the authenticated provider
 * @param {string} userId
 * @param {Object} queryParams
 */
const listQuotesForProvider = async (userId, queryParams = {}) => {
  const query = { provider: userId };

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await Quote.countDocuments(query);
  const quotes = await Quote.find(query)
    .populate({
      path: 'serviceRequest',
      select: 'title category location preferredDate status',
      populate: {
        path: 'category',
        select: 'name slug icon',
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    items: quotes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single quote owned by the authenticated provider
 * @param {string} userId
 * @param {string} quoteId
 */
const getQuoteForProvider = async (userId, quoteId) => {
  const quote = await Quote.findById(quoteId).populate({
    path: 'serviceRequest',
    select: 'title category location preferredDate status description',
    populate: {
      path: 'category',
      select: 'name slug icon',
    },
  });

  if (!quote) {
    throw ApiError.notFound('Quote not found');
  }

  if (!quote.provider.equals(userId)) {
    throw ApiError.forbidden('Access denied: You do not own this quote');
  }

  return quote;
};

/**
 * Provider withdraws their submitted quote before acceptance
 * @param {string} userId
 * @param {string} quoteId
 */
const withdrawQuote = async (userId, quoteId) => {
  const quote = await Quote.findById(quoteId);
  if (!quote) {
    throw ApiError.notFound('Quote not found');
  }

  if (!quote.provider.equals(userId)) {
    throw ApiError.forbidden('Access denied: You cannot withdraw another provider\'s quote');
  }

  if (!isValidTransition(VALID_QUOTE_TRANSITIONS, quote.status, QUOTE_STATUS.WITHDRAWN)) {
    throw ApiError.badRequest(
      `Cannot withdraw quote with current status "${quote.status}"`
    );
  }

  quote.status = QUOTE_STATUS.WITHDRAWN;
  await quote.save();
  return quote;
};

/**
 * Customer accepts a quote for their service request
 * Transitions accepted quote to ACCEPTED, other active quotes to REJECTED,
 * and request status to PROVIDER_SELECTED.
 * @param {Object} user - Authenticated customer
 * @param {string} requestId
 * @param {string} quoteId
 */
const acceptQuote = async (user, requestId, quoteId) => {
  const serviceRequest = await ServiceRequest.findById(requestId);
  if (!serviceRequest) {
    throw ApiError.notFound('Service request not found');
  }

  if (!serviceRequest.customer.equals(user._id)) {
    throw ApiError.forbidden('Access denied: You do not own this service request');
  }

  const quote = await Quote.findById(quoteId);
  if (!quote || !quote.serviceRequest.equals(requestId)) {
    throw ApiError.notFound('Quote not found for this service request');
  }

  if (!isValidTransition(VALID_QUOTE_TRANSITIONS, quote.status, QUOTE_STATUS.ACCEPTED)) {
    throw ApiError.badRequest(`Cannot accept quote with status "${quote.status}"`);
  }

  // Accept selected quote
  quote.status = QUOTE_STATUS.ACCEPTED;
  await quote.save();

  // Reject all other active quotes for this request
  await Quote.updateMany(
    {
      serviceRequest: requestId,
      _id: { $ne: quoteId },
      status: { $in: [QUOTE_STATUS.SUBMITTED, QUOTE_STATUS.VIEWED] },
    },
    { status: QUOTE_STATUS.REJECTED }
  );

  // Transition request to PROVIDER_SELECTED
  serviceRequest.status = SERVICE_REQUEST_STATUS.PROVIDER_SELECTED;
  await serviceRequest.save();

  return {
    quote,
    serviceRequest,
  };
};

module.exports = {
  createQuote,
  listQuotesForRequest,
  listQuotesForProvider,
  getQuoteForProvider,
  withdrawQuote,
  acceptQuote,
};
