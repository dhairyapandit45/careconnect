/**
 * ServiceRequest Business Logic Service
 * Handles customer request creation, server-side ownership isolation, and operational querying.
 */

const ServiceRequest = require('../models/ServiceRequest');
const ServiceCategory = require('../models/ServiceCategory');
const Quote = require('../models/Quote');
const { ApiError } = require('../utils/apiError');
const { ROLES } = require('../constants/roles');
const { SERVICE_REQUEST_STATUS } = require('../constants/status');

/**
 * Creates a new service request bound to authenticated customer
 * @param {string} customerId
 * @param {Object} data
 */
const createServiceRequest = async (customerId, data) => {
  // Validate that the category exists and is active
  const category = await ServiceCategory.findById(data.categoryId);
  if (!category || !category.isActive) {
    throw new ApiError(
      400,
      'Selected service category does not exist or is currently inactive',
      'CATEGORY_INACTIVE'
    );
  }

  // Sanitize location and time data
  const location = {
    address: data.address.trim(),
    city: data.city.trim(),
    postalCode: data.postalCode.trim(),
    state: data.state ? data.state.trim() : '',
  };

  const preferredTime = data.preferredTime || {
    start: '09:00',
    end: '12:00',
  };

  // Enforce initial status to SUBMITTED and customer to authenticated principal
  const newRequest = await ServiceRequest.create({
    customer: customerId,
    category: category._id,
    title: data.title.trim(),
    description: data.description.trim(),
    location,
    preferredDate: new Date(data.preferredDate),
    preferredTime,
    preferredTimeSlot: data.preferredTimeSlot || 'MORNING',
    requiredSkills: data.requiredSkills || [],
    status: SERVICE_REQUEST_STATUS.SUBMITTED,
  });

  return ServiceRequest.findById(newRequest._id)
    .populate('category', 'name slug icon startingPrice pricingUnit')
    .populate('customer', 'name email phone');
};

/**
 * Lists service requests with server-side ownership enforcement & pagination
 * @param {Object} user - Authenticated user principal
 * @param {Object} queryParams
 */
const listServiceRequests = async (user, queryParams = {}) => {
  // Service providers are isolated until matching milestone
  if (user.role === ROLES.SERVICE_PROVIDER) {
    throw ApiError.forbidden('Service providers cannot access customer request pool via this endpoint');
  }

  const query = {};

  // Strict ownership boundary: Customers can ONLY ever see their own requests
  if (user.role === ROLES.CUSTOMER) {
    query.customer = user._id;
  } else if (queryParams.customerId) {
    // Admin/Operations/Support can filter by customer
    query.customer = queryParams.customerId;
  }

  // Filter by category
  if (queryParams.category) {
    query.category = queryParams.category;
  }

  // Filter by status
  if (queryParams.status) {
    query.status = queryParams.status;
  }

  // Filter by date range
  if (queryParams.dateFrom || queryParams.dateTo) {
    query.preferredDate = {};
    if (queryParams.dateFrom) {
      query.preferredDate.$gte = new Date(queryParams.dateFrom);
    }
    if (queryParams.dateTo) {
      query.preferredDate.$lte = new Date(queryParams.dateTo);
    }
  }

  // Pagination parameters with strict ceiling cap of 50
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await ServiceRequest.countDocuments(query);
  const items = await ServiceRequest.find(query)
    .populate('category', 'name slug icon startingPrice pricingUnit')
    .populate('customer', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Aggregated quote counts for listed requests without N+1 queries
  const requestIds = items.map((it) => it._id);
  const quoteCounts = await Quote.aggregate([
    { $match: { serviceRequest: { $in: requestIds } } },
    { $group: { _id: '$serviceRequest', count: { $sum: 1 } } },
  ]);
  const quoteCountMap = {};
  quoteCounts.forEach((qc) => {
    quoteCountMap[qc._id.toString()] = qc.count;
  });

  const enrichedItems = items.map((it) => {
    const obj = it.toObject ? it.toObject() : it;
    return {
      ...obj,
      quoteCount: quoteCountMap[it._id.toString()] || 0,
    };
  });

  return {
    items: enrichedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single service request with role-based access check
 * @param {Object} user
 * @param {string} requestId
 */
const getServiceRequestById = async (user, requestId) => {
  const request = await ServiceRequest.findById(requestId)
    .populate('category', 'name slug icon startingPrice pricingUnit description')
    .populate('customer', 'name email phone');

  if (!request) {
    throw ApiError.notFound('Service request not found');
  }

  // Ownership verification for customers
  if (user.role === ROLES.CUSTOMER && !request.customer._id.equals(user._id)) {
    throw ApiError.forbidden('Access denied: You do not have permission to view this service request');
  }

  if (user.role === ROLES.SERVICE_PROVIDER) {
    throw ApiError.forbidden('Access denied: Service providers cannot access this request directly');
  }

  const quoteCount = await Quote.countDocuments({ serviceRequest: requestId });
  const reqObj = request.toObject ? request.toObject() : request;

  return {
    ...reqObj,
    quoteCount,
  };
};

module.exports = {
  createServiceRequest,
  listServiceRequests,
  getServiceRequestById,
};
