/**
 * Provider Eligibility & Discovery Service
 * Deterministic business rules engine for identifying eligible providers and accessible service requests.
 * Strictly adheres to rule-based filtering (APPROVED + ACTIVE + Category Compatible + Service Area Compatible).
 */

const ProviderProfile = require('../models/ProviderProfile');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { ApiError } = require('../utils/apiError');
const { USER_STATUS, PROVIDER_VERIFICATION_STATUS, SERVICE_REQUEST_STATUS } = require('../constants/status');

/**
 * Checks if a given provider profile is deterministically eligible for a given service request
 * @param {Object} profile - Populated ProviderProfile or raw doc
 * @param {Object} user - User document of provider
 * @param {Object} serviceRequest - ServiceRequest document
 * @returns {boolean}
 */
const checkProviderEligibility = (profile, user, serviceRequest) => {
  if (!profile || !user || !serviceRequest) return false;

  // 1. Provider must be verified and approved
  if (profile.verificationStatus !== PROVIDER_VERIFICATION_STATUS.APPROVED) {
    return false;
  }

  // 2. Provider user account must be ACTIVE
  if (user.status !== USER_STATUS.ACTIVE) {
    return false;
  }

  // 3. Provider must support the requested service category
  const requestCategoryId = (serviceRequest.category?._id || serviceRequest.category).toString();
  const providerCategories = (profile.serviceCategories || []).map((cat) =>
    (cat._id || cat).toString()
  );
  if (!providerCategories.includes(requestCategoryId)) {
    return false;
  }

  // 4. Provider's service area must cover the request city (case-insensitive)
  const requestCity = (serviceRequest.location?.city || '').trim().toLowerCase();
  if (!requestCity) return false;

  const matchesLocation = (profile.serviceAreas || []).some((area) => {
    return (area.city || '').trim().toLowerCase() === requestCity;
  });

  return matchesLocation;
};

/**
 * Sanitizes service request for provider view, excluding sensitive customer contact info
 * @param {Object} request
 */
const sanitizeRequestForProvider = (request) => {
  const reqObj = request.toObject ? request.toObject() : request;
  return {
    _id: reqObj._id,
    category: reqObj.category,
    title: reqObj.title,
    description: reqObj.description,
    location: {
      city: reqObj.location?.city,
      state: reqObj.location?.state,
      postalCode: reqObj.location?.postalCode,
      // address is omitted for privacy before booking confirmation
    },
    preferredDate: reqObj.preferredDate,
    preferredTime: reqObj.preferredTime,
    preferredTimeSlot: reqObj.preferredTimeSlot,
    requiredSkills: reqObj.requiredSkills || [],
    status: reqObj.status,
    createdAt: reqObj.createdAt,
  };
};

/**
 * Lists eligible ServiceRequests for the authenticated provider
 * @param {string} userId
 * @param {Object} queryParams - { page, limit, category, search }
 */
const listEligibleRequestsForProvider = async (userId, queryParams = {}) => {
  const user = await User.findById(userId);
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('Your account must be active to view available requests');
  }

  const profile = await ProviderProfile.findOne({ user: userId });
  if (!profile || profile.verificationStatus !== PROVIDER_VERIFICATION_STATUS.APPROVED) {
    // Unverified or non-approved providers cannot see eligible marketplace requests
    return {
      items: [],
      pagination: {
        page: 1,
        limit: Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10)),
        total: 0,
        totalPages: 0,
      },
    };
  }

  const providerCategoryIds = profile.serviceCategories || [];
  const providerCities = (profile.serviceAreas || [])
    .map((sa) => sa.city?.trim())
    .filter(Boolean);

  if (providerCategoryIds.length === 0 || providerCities.length === 0) {
    return {
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  // Regex array for case-insensitive city match
  const cityRegexes = providerCities.map((city) => new RegExp(`^${city}$`, 'i'));

  const query = {
    category: { $in: providerCategoryIds },
    'location.city': { $in: cityRegexes },
    status: {
      $in: [
        SERVICE_REQUEST_STATUS.SUBMITTED,
        SERVICE_REQUEST_STATUS.MATCHING,
        SERVICE_REQUEST_STATUS.QUOTING,
      ],
    },
  };

  if (queryParams.category) {
    query.category = queryParams.category;
  }

  if (queryParams.search) {
    query.title = new RegExp(queryParams.search.trim(), 'i');
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await ServiceRequest.countDocuments(query);
  const rawRequests = await ServiceRequest.find(query)
    .populate('category', 'name slug icon startingPrice pricingUnit')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const items = rawRequests.map(sanitizeRequestForProvider);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single service request detail if provider is eligible
 * @param {string} userId
 * @param {string} requestId
 */
const getEligibleRequestDetail = async (userId, requestId) => {
  const [user, profile, serviceRequest] = await Promise.all([
    User.findById(userId),
    ProviderProfile.findOne({ user: userId }),
    ServiceRequest.findById(requestId).populate('category', 'name slug icon startingPrice pricingUnit description'),
  ]);

  if (!serviceRequest) {
    throw ApiError.notFound('Service request not found');
  }

  if (!user || user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('Your account must be active to view service requests');
  }

  if (!profile || profile.verificationStatus !== PROVIDER_VERIFICATION_STATUS.APPROVED) {
    throw ApiError.forbidden('Your provider profile must be verified and approved to view this request');
  }

  const isEligible = checkProviderEligibility(profile, user, serviceRequest);
  if (!isEligible) {
    throw ApiError.forbidden('Access denied: You are not eligible to view or quote on this service request');
  }

  return sanitizeRequestForProvider(serviceRequest);
};

module.exports = {
  checkProviderEligibility,
  sanitizeRequestForProvider,
  listEligibleRequestsForProvider,
  getEligibleRequestDetail,
};
