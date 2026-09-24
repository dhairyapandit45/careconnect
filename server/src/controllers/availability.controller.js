/**
 * Provider Availability Controller
 */

const { sendSuccess } = require('../utils/apiResponse');
const providerAvailabilityService = require('../services/providerAvailability.service');

const getAvailability = async (req, res, next) => {
  try {
    const shifts = await providerAvailabilityService.getProviderAvailability(req.user._id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider availability schedule retrieved successfully',
      data: { items: shifts },
    });
  } catch (error) {
    next(error);
  }
};

const createAvailability = async (req, res, next) => {
  try {
    const shift = await providerAvailabilityService.createAvailability(req.user._id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Availability slot created successfully',
      data: { shift },
    });
  } catch (error) {
    next(error);
  }
};

const updateAvailability = async (req, res, next) => {
  try {
    const shift = await providerAvailabilityService.updateAvailability(
      req.user._id,
      req.params.id,
      req.body
    );
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Availability slot updated successfully',
      data: { shift },
    });
  } catch (error) {
    next(error);
  }
};

const deleteAvailability = async (req, res, next) => {
  try {
    const result = await providerAvailabilityService.deleteAvailability(req.user._id, req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Availability slot removed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
};
