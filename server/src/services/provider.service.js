/**
 * Provider Profile Business Logic Service
 * Enforces ownership, profile integrity, active category verification, and administrative transitions.
 */

const ProviderProfile = require('../models/ProviderProfile');
const ServiceCategory = require('../models/ServiceCategory');
const { ApiError } = require('../utils/apiError');
const { ROLES } = require('../constants/roles');
const {
  PROVIDER_VERIFICATION_STATUS,
  VALID_PROVIDER_VERIFICATION_TRANSITIONS,
  isValidTransition,
} = require('../constants/status');

const DEFAULT_TRADE_SKILLS = [
  'Appliance Repair',
  'Washing Machine Repair',
  'Refrigerator Repair',
  'Microwave Repair',
  'Electrical Repair',
  'Circuit Breaker Maintenance',
  'Wiring & Rewiring',
  'Plumbing',
  'Pipe Leak Repair',
  'Drain Cleaning',
  'Deep Cleaning',
  'Sanitization',
  'AC Repair & Servicing',
  'HVAC Maintenance',
  'Carpentry',
  'Furniture Assembly',
  'Painting',
  'General Maintenance',
];

/**
 * Normalizes action string or direct status into standard verification status
 */
const resolveTargetStatus = (action, status) => {
  if (action) {
    switch (action.toUpperCase()) {
      case 'APPROVE':
        return PROVIDER_VERIFICATION_STATUS.APPROVED;
      case 'REJECT':
        return PROVIDER_VERIFICATION_STATUS.REJECTED;
      case 'SUSPEND':
        return PROVIDER_VERIFICATION_STATUS.SUSPENDED;
      case 'REQUEST_REVIEW':
        return PROVIDER_VERIFICATION_STATUS.UNDER_REVIEW;
      default:
        break;
    }
  }

  if (status && Object.values(PROVIDER_VERIFICATION_STATUS).includes(status.toUpperCase())) {
    return status.toUpperCase();
  }

  throw ApiError.badRequest('Invalid verification action or target status provided');
};

/**
 * Retrieves the authenticated provider's own profile
 * @param {string} userId
 */
const getProviderProfileByUserId = async (userId) => {
  return ProviderProfile.findOne({ user: userId })
    .populate('serviceCategories', 'name slug icon startingPrice pricingUnit isActive')
    .populate('user', 'name email phone role status');
};

/**
 * Retrieves a provider profile by ID with strict data sanitization
 * Safe public projection for customers/guests; complete profile for owner and staff.
 * @param {string} profileId
 * @param {Object} [viewer]
 */
const getProviderProfileById = async (profileId, viewer = null) => {
  const profile = await ProviderProfile.findById(profileId)
    .populate('serviceCategories', 'name slug icon startingPrice pricingUnit isActive')
    .populate('user', 'name email phone role status');

  if (!profile) {
    throw ApiError.notFound('Provider profile not found');
  }

  const isOwner = viewer && viewer._id && profile.user && profile.user._id.toString() === viewer._id.toString();
  const isStaff = viewer && [ROLES.PLATFORM_ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.SUPPORT_AGENT].includes(viewer.role);

  if (isOwner || isStaff) {
    return profile;
  }

  // Safe public summary projection: exclude sensitive documents, private contacts, and verification notes
  return {
    _id: profile._id,
    businessName: profile.businessName,
    description: profile.description,
    skills: profile.skills,
    serviceCategories: profile.serviceCategories,
    serviceAreas: profile.serviceAreas,
    experienceYears: profile.experienceYears,
    pricing: profile.pricing,
    rating: profile.rating,
    reviewCount: profile.reviewCount,
    verificationStatus: profile.verificationStatus,
    isAvailable: profile.isAvailable,
    createdAt: profile.createdAt,
  };
};

/**
 * Creates a new provider profile bound to the authenticated user
 * @param {string} userId
 * @param {Object} data
 */
const createProviderProfile = async (userId, data) => {
  // Check for duplicate profile
  const existing = await ProviderProfile.findOne({ user: userId });
  if (existing) {
    throw ApiError.duplicate('A provider profile already exists for this account');
  }

  // Validate that all selected categories exist and are active
  if (data.serviceCategories && data.serviceCategories.length > 0) {
    const activeCategories = await ServiceCategory.find({
      _id: { $in: data.serviceCategories },
      isActive: true,
    });

    if (activeCategories.length !== data.serviceCategories.length) {
      throw ApiError.badRequest('One or more selected service categories do not exist or are currently inactive');
    }
  }

  // Sanitize pricing
  const pricing = data.pricing || {
    model: 'HOURLY',
    minimumCharge: 0,
    hourlyRate: data.hourlyRate || 0,
  };

  if (data.hourlyRate !== undefined && pricing.hourlyRate === undefined) {
    pricing.hourlyRate = data.hourlyRate;
  }

  // Enforce server-side defaults: initial verificationStatus is always PENDING
  await ProviderProfile.create({
    user: userId,
    businessName: data.businessName.trim(),
    description: data.description.trim(),
    skills: data.skills || [],
    serviceCategories: data.serviceCategories || [],
    serviceAreas: data.serviceAreas || [],
    experienceYears: data.experienceYears !== undefined ? data.experienceYears : 0,
    pricing,
    hourlyRate: pricing.hourlyRate || 0,
    documents: data.documents || [],
    verificationStatus: PROVIDER_VERIFICATION_STATUS.PENDING,
    verificationNotes: '',
    rating: 0,
    reviewCount: 0,
    isAvailable: true,
  });

  return getProviderProfileByUserId(userId);
};

/**
 * Updates provider profile with ownership security
 * @param {string} userId
 * @param {Object} updateData
 */
const updateProviderProfile = async (userId, updateData) => {
  const profile = await ProviderProfile.findOne({ user: userId });
  if (!profile) {
    throw ApiError.notFound('Provider profile not found for this account');
  }

  // If updating service categories, verify that they are active
  if (updateData.serviceCategories && updateData.serviceCategories.length > 0) {
    const activeCategories = await ServiceCategory.find({
      _id: { $in: updateData.serviceCategories },
      isActive: true,
    });

    if (activeCategories.length !== updateData.serviceCategories.length) {
      throw ApiError.badRequest('One or more selected service categories do not exist or are currently inactive');
    }
    profile.serviceCategories = updateData.serviceCategories;
  }

  // Allowed provider-editable fields
  if (updateData.businessName !== undefined) profile.businessName = updateData.businessName.trim();
  if (updateData.description !== undefined) profile.description = updateData.description.trim();
  if (updateData.skills !== undefined) profile.skills = updateData.skills;
  if (updateData.serviceAreas !== undefined) profile.serviceAreas = updateData.serviceAreas;
  if (updateData.experienceYears !== undefined) profile.experienceYears = updateData.experienceYears;
  if (updateData.isAvailable !== undefined) profile.isAvailable = updateData.isAvailable;

  if (updateData.pricing !== undefined) {
    profile.pricing = {
      ...profile.pricing?.toObject(),
      ...updateData.pricing,
    };
    if (profile.pricing.hourlyRate !== undefined) {
      profile.hourlyRate = profile.pricing.hourlyRate;
    }
  }

  if (updateData.hourlyRate !== undefined) {
    profile.hourlyRate = updateData.hourlyRate;
    if (profile.pricing) profile.pricing.hourlyRate = updateData.hourlyRate;
  }

  if (updateData.documents !== undefined) {
    profile.documents = updateData.documents;
  }

  // Strictly ignore / prevent client from modifying verificationStatus, rating, reviewCount, verificationNotes
  await profile.save();

  return getProviderProfileByUserId(userId);
};

/**
 * Admin: Lists service providers with filters and pagination
 * @param {Object} queryParams
 */
const listProvidersAdmin = async (queryParams = {}) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const query = {};

  if (queryParams.verificationStatus) {
    query.verificationStatus = queryParams.verificationStatus.toUpperCase();
  }

  if (queryParams.serviceCategory) {
    query.serviceCategories = queryParams.serviceCategory;
  }

  if (queryParams.city) {
    query['serviceAreas.city'] = new RegExp(queryParams.city.trim(), 'i');
  }

  const [items, total] = await Promise.all([
    ProviderProfile.find(query)
      .populate('user', 'name email phone status')
      .populate('serviceCategories', 'name slug icon startingPrice pricingUnit')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ProviderProfile.countDocuments(query),
  ]);

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
 * Admin: Reviews and transitions provider verification status
 * @param {string} profileId
 * @param {string} action
 * @param {string} status
 * @param {string} [reason]
 */
const verifyProviderAdmin = async (profileId, { action, status, reason, notes }) => {
  const targetStatus = resolveTargetStatus(action, status);
  const profile = await ProviderProfile.findById(profileId);

  if (!profile) {
    throw ApiError.notFound('Provider profile not found');
  }

  // Validate state transition
  const isAllowed = isValidTransition(
    VALID_PROVIDER_VERIFICATION_TRANSITIONS,
    profile.verificationStatus,
    targetStatus
  );

  if (!isAllowed) {
    throw ApiError.badRequest(
      `Invalid verification status transition from ${profile.verificationStatus} to ${targetStatus}`
    );
  }

  profile.verificationStatus = targetStatus;
  if (reason || notes) {
    profile.verificationNotes = (reason || notes).trim();
  }

  await profile.save();

  return ProviderProfile.findById(profileId)
    .populate('user', 'name email phone status')
    .populate('serviceCategories', 'name slug icon startingPrice pricingUnit');
};

/**
 * Retrieves the available trade skills catalog
 */
const getSkillsCatalog = async () => {
  const categorySkills = await ServiceCategory.distinct('requiredSkills', { isActive: true });
  const allSkills = Array.from(new Set([...DEFAULT_TRADE_SKILLS, ...categorySkills.filter(Boolean)]));
  return allSkills.sort();
};

module.exports = {
  getProviderProfileByUserId,
  getProviderProfileById,
  createProviderProfile,
  updateProviderProfile,
  listProvidersAdmin,
  verifyProviderAdmin,
  getSkillsCatalog,
};
