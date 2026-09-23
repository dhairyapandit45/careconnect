/**
 * ServiceCategory Controller
 */

const categoryService = require('../services/category.service');
const { sendSuccess } = require('../utils/apiResponse');
const { ROLES } = require('../constants/roles');

const getCategories = async (req, res, next) => {
  try {
    const isPlatformAdmin = req.user?.role === ROLES.PLATFORM_ADMIN;
    const includeInactive = isPlatformAdmin && req.query.includeInactive === 'true';

    const categories = await categoryService.listCategories({ includeInactive });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Categories retrieved successfully',
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Category retrieved successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Service category created successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Service category updated successfully',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const result = await categoryService.deleteCategory(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
