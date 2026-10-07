/**
 * Review Service
 * Manages review lifecycle, verified fulfillment authorization,
 * idempotency, and provider rating recalculation.
 */

const mongoose = require('mongoose');
const Review = require('../models/Review');
const Job = require('../models/Job');
const Booking = require('../models/Booking');
const ProviderProfile = require('../models/ProviderProfile');
const { JOB_STATUS, NOTIFICATION_TYPE } = require('../constants/status');
const { ROLES } = require('../constants/roles');
const { ApiError } = require('../utils/apiError');

/**
 * Recalculates and persists provider's average rating and reviewCount on ProviderProfile
 * @param {mongoose.Types.ObjectId|string} providerProfileId
 * @param {mongoose.Types.ObjectId|string} providerUserId
 */
async function updateProviderRatingAggregation(providerProfileId, providerUserId) {
  const query = providerUserId
    ? { provider: providerUserId }
    : { providerProfile: providerProfileId };

  const reviews = await Review.find(query);
  const reviewCount = reviews.length;
  let rating = 0;

  if (reviewCount > 0) {
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    rating = Math.round((totalRating / reviewCount) * 10) / 10;
  }

  let profile = null;
  if (providerProfileId) {
    profile = await ProviderProfile.findById(providerProfileId);
  }
  if (!profile && providerUserId) {
    profile = await ProviderProfile.findOne({ user: providerUserId });
  }

  if (profile) {
    await ProviderProfile.updateOne(
      { _id: profile._id },
      { $set: { rating, reviewCount } }
    );
  }

  return { rating, reviewCount };
}

/**
 * Creates a new review for a completed job
 * @param {object} customerUser
 * @param {object} payload
 */
async function createReview(customerUser, payload) {
  if (customerUser.role !== ROLES.CUSTOMER) {
    throw ApiError.forbidden('Only customers can submit reviews');
  }

  const jobIdentifier = payload.jobId || payload.job;
  const bookingIdentifier = payload.bookingId || payload.booking;

  let job = null;
  if (jobIdentifier) {
    if (!mongoose.Types.ObjectId.isValid(jobIdentifier)) {
      throw ApiError.badRequest('Invalid job ID format');
    }
    job = await Job.findById(jobIdentifier);
  } else if (bookingIdentifier) {
    if (!mongoose.Types.ObjectId.isValid(bookingIdentifier)) {
      throw ApiError.badRequest('Invalid booking ID format');
    }
    job = await Job.findOne({ booking: bookingIdentifier });
  }

  if (!job) {
    throw ApiError.notFound('Completed job not found');
  }

  // Cross-check booking if both job and booking identifiers were supplied
  if (bookingIdentifier && String(job.booking) !== String(bookingIdentifier)) {
    throw ApiError.badRequest('Job does not belong to specified booking');
  }

  // A provider cannot review themselves or review jobs where they are the provider
  if (String(job.provider) === String(customerUser._id)) {
    throw ApiError.forbidden('Providers cannot review their own jobs');
  }

  // Customer ownership check
  if (String(job.customer) !== String(customerUser._id)) {
    throw ApiError.forbidden('You can only review your own completed jobs');
  }

  // Verify job fulfillment completion
  if (job.status !== JOB_STATUS.COMPLETED) {
    throw ApiError.badRequest('Reviews can only be submitted for completed jobs');
  }

  // Idempotency: verify no existing review for this job
  const existingReview = await Review.findOne({ job: job._id });
  if (existingReview) {
    throw ApiError.conflict('A review has already been submitted for this job');
  }

  // Server-side resolution of providerProfile from Booking
  let providerProfileId = null;
  const booking = await Booking.findById(job.booking);
  if (booking && booking.providerProfile) {
    providerProfileId = booking.providerProfile;
  } else {
    const profile = await ProviderProfile.findOne({ user: job.provider });
    if (profile) {
      providerProfileId = profile._id;
    }
  }

  const review = new Review({
    job: job._id,
    booking: job.booking,
    customer: job.customer,
    provider: job.provider,
    providerProfile: providerProfileId,
    rating: payload.rating,
    comment: payload.comment || '',
  });

  try {
    await review.save();
  } catch (err) {
    if (err.code === 11000) {
      throw ApiError.conflict('A review has already been submitted for this job');
    }
    throw err;
  }

  // Recalculate provider profile rating aggregation
  await updateProviderRatingAggregation(providerProfileId, job.provider);

  try {
    const notificationService = require('./notification.service');
    await notificationService.createNotification({
      recipient: review.provider,
      type: NOTIFICATION_TYPE.REVIEW_RECEIVED,
      title: 'New Review Received',
      message: `You received a ${review.rating}-star review for your completed job.`,
      relatedBooking: review.booking,
      relatedJob: review.job,
      relatedReview: review._id,
    });
  } catch {
    // Non-blocking notification
  }

  return review;
}

/**
 * Retrieves a review by ID with role-based access validation
 * @param {string} reviewId
 * @param {object} user
 */
async function getReviewById(reviewId, user) {
  if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
    throw ApiError.badRequest('Invalid review ID format');
  }

  const review = await Review.findById(reviewId)
    .populate('customer', 'name email')
    .populate('provider', 'name email')
    .populate('job')
    .populate('booking');

  if (!review) {
    throw ApiError.notFound('Review not found');
  }

  const userIdStr = String(user._id);
  const customerIdStr = String(review.customer?._id || review.customer);
  const providerIdStr = String(review.provider?._id || review.provider);

  if (user.role === ROLES.PLATFORM_ADMIN) {
    return review;
  }
  if (user.role === ROLES.CUSTOMER) {
    if (customerIdStr !== userIdStr) {
      throw ApiError.forbidden('Customers can only access their own reviews');
    }
    return review;
  }
  if (user.role === ROLES.SERVICE_PROVIDER) {
    if (providerIdStr !== userIdStr) {
      throw ApiError.forbidden('Providers can only access reviews for their services');
    }
    return review;
  }

  throw ApiError.forbidden('You do not have permission to access this review');
}

/**
 * Updates an existing review (customer only)
 * @param {string} reviewId
 * @param {object} customerUser
 * @param {object} payload
 */
async function updateReview(reviewId, customerUser, payload) {
  if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
    throw ApiError.badRequest('Invalid review ID format');
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw ApiError.notFound('Review not found');
  }

  if (String(review.customer) !== String(customerUser._id)) {
    throw ApiError.forbidden('You can only update your own reviews');
  }

  if (payload.rating !== undefined) {
    review.rating = payload.rating;
  }
  if (payload.comment !== undefined) {
    review.comment = payload.comment;
  }

  await review.save();

  // Recalculate provider profile rating aggregation
  await updateProviderRatingAggregation(review.providerProfile, review.provider);

  return review;
}

/**
 * Deletes a review (admin moderation only)
 * @param {string} reviewId
 * @param {object} user
 */
async function deleteReview(reviewId, user) {
  if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
    throw ApiError.badRequest('Invalid review ID format');
  }

  if (user.role !== ROLES.PLATFORM_ADMIN) {
    throw ApiError.forbidden('Only platform administrators can delete reviews');
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw ApiError.notFound('Review not found');
  }

  const providerProfileId = review.providerProfile;
  const providerId = review.provider;

  await Review.findByIdAndDelete(reviewId);

  // Recalculate provider profile rating aggregation
  const aggregation = await updateProviderRatingAggregation(providerProfileId, providerId);

  return { success: true, message: 'Review deleted successfully', aggregation };
}

/**
 * Lists reviews submitted by a customer
 * @param {string} customerId
 * @param {object} queryParams
 */
async function listCustomerReviews(customerId, queryParams = {}) {
  const filter = { customer: customerId };
  if (queryParams.rating) {
    const ratingNum = parseInt(queryParams.rating, 10);
    if (!isNaN(ratingNum)) filter.rating = ratingNum;
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await Review.countDocuments(filter);
  const items = await Review.find(filter)
    .populate('provider', 'name email')
    .populate('job')
    .populate('booking')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Lists reviews received by a service provider
 * @param {string} providerId
 * @param {object} queryParams
 */
async function listProviderReviews(providerId, queryParams = {}) {
  const filter = { provider: providerId };
  if (queryParams.rating) {
    const ratingNum = parseInt(queryParams.rating, 10);
    if (!isNaN(ratingNum)) filter.rating = ratingNum;
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await Review.countDocuments(filter);
  const items = await Review.find(filter)
    .populate('customer', 'name email')
    .populate('job')
    .populate('booking')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Lists all reviews for platform admin moderation
 * @param {object} queryParams
 */
async function listAdminReviews(queryParams = {}) {
  const filter = {};
  if (queryParams.provider) filter.provider = queryParams.provider;
  if (queryParams.customer) filter.customer = queryParams.customer;
  if (queryParams.rating) {
    const ratingNum = parseInt(queryParams.rating, 10);
    if (!isNaN(ratingNum)) filter.rating = ratingNum;
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await Review.countDocuments(filter);
  const items = await Review.find(filter)
    .populate('customer', 'name email')
    .populate('provider', 'name email')
    .populate('job')
    .populate('booking')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = {
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  listCustomerReviews,
  listProviderReviews,
  listAdminReviews,
  updateProviderRatingAggregation,
};
