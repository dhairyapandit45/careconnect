/**
 * Provider & Verification Controller
 */

const providerService = require('../services/provider.service');
const { sendSuccess } = require('../utils/apiResponse');

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await providerService.getProviderProfileByUserId(req.user._id);
    return sendSuccess(res, {
      statusCode: 200,
      message: profile ? 'Provider profile retrieved' : 'Provider profile not yet created',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

const getProviderById = async (req, res, next) => {
  try {
    const profile = await providerService.getProviderProfileById(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider profile retrieved',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

const createProfile = async (req, res, next) => {
  try {
    const profile = await providerService.createProviderProfile(req.user._id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Provider profile created successfully and submitted for review',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await providerService.updateProviderProfile(req.user._id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider profile updated successfully',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

const getSkills = async (req, res, next) => {
  try {
    const skills = await providerService.getSkillsCatalog();
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Skills catalog retrieved',
      data: { skills },
    });
  } catch (error) {
    next(error);
  }
};

const listProvidersAdmin = async (req, res, next) => {
  try {
    const result = await providerService.listProvidersAdmin(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Provider list retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const verifyProviderAdmin = async (req, res, next) => {
  try {
    const profile = await providerService.verifyProviderAdmin(req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: `Provider verification status updated to ${profile.verificationStatus}`,
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  getProviderById,
  createProfile,
  updateProfile,
  getSkills,
  listProvidersAdmin,
  verifyProviderAdmin,
};
