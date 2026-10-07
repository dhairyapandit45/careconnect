/**
 * Review Controller
 * Handles review submissions, updates, role-scoped listings, and admin moderation.
 */

const reviewService = require('../services/review.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Submit a new review for a completed job (Customer only)
 */
const createReview = async (req, res, next) => {
  try {
    const review = await reviewService.createReview(req.user, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Review submitted successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve a single review by ID with role authorization
 */
const getReviewById = async (req, res, next) => {
  try {
    const review = await reviewService.getReviewById(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Review retrieved successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing review (Customer only)
 */
const updateReview = async (req, res, next) => {
  try {
    const review = await reviewService.updateReview(req.params.id, req.user, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Review updated successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a review (Admin moderation only)
 */
const deleteReview = async (req, res, next) => {
  try {
    const result = await reviewService.deleteReview(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Review deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List reviews for the authenticated customer
 */
const listCustomerReviews = async (req, res, next) => {
  try {
    const result = await reviewService.listCustomerReviews(req.user._id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Customer reviews retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List reviews received by the authenticated service provider
 */
const listProviderReviews = async (req, res, next) => {
  try {
    const result = await reviewService.listProviderReviews(req.user._id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider reviews retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all reviews for platform administrators
 */
const listAdminReviews = async (req, res, next) => {
  try {
    const result = await reviewService.listAdminReviews(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'All reviews retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  listCustomerReviews,
  listProviderReviews,
  listAdminReviews,
};
