/**
 * ServiceCategory Business Logic Service
 */

const ServiceCategory = require('../models/ServiceCategory');
const ServiceRequest = require('../models/ServiceRequest');
const { ApiError } = require('../utils/apiError');

/**
 * Generates a clean URL slug from category name
 * @param {string} name
 * @returns {string}
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Lists categories with active status filtering
 * @param {Object} options
 * @param {boolean} options.includeInactive
 */
const listCategories = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  return ServiceCategory.find(filter).sort({ name: 1 });
};

/**
 * Retrieves a single category by ID
 * @param {string} id
 */
const getCategoryById = async (id) => {
  const category = await ServiceCategory.findById(id);
  if (!category) {
    throw ApiError.notFound('Service category not found');
  }
  return category;
};

/**
 * Creates a new service category
 * @param {Object} data
 */
const createCategory = async (data) => {
  const name = data.name.trim();
  const slug = (data.slug ? data.slug.trim().toLowerCase() : null) || generateSlug(name);

  // Check for duplicate name or slug
  const existing = await ServiceCategory.findOne({
    $or: [{ name: new RegExp(`^${name}$`, 'i') }, { slug }],
  });

  if (existing) {
    throw ApiError.duplicate('A category with this name or slug already exists');
  }

  const category = await ServiceCategory.create({
    ...data,
    name,
    slug,
  });

  return category;
};

/**
 * Updates an existing category
 * @param {string} id
 * @param {Object} updateData
 */
const updateCategory = async (id, updateData) => {
  const category = await ServiceCategory.findById(id);
  if (!category) {
    throw ApiError.notFound('Service category not found');
  }

  if (updateData.name && updateData.name.trim() !== category.name) {
    const newName = updateData.name.trim();
    const newSlug = updateData.slug ? updateData.slug.trim().toLowerCase() : generateSlug(newName);

    const duplicate = await ServiceCategory.findOne({
      _id: { $ne: id },
      $or: [{ name: new RegExp(`^${newName}$`, 'i') }, { slug: newSlug }],
    });

    if (duplicate) {
      throw ApiError.duplicate('Another category already uses this name or slug');
    }

    category.name = newName;
    category.slug = newSlug;
  } else if (updateData.slug && updateData.slug.trim().toLowerCase() !== category.slug) {
    const newSlug = updateData.slug.trim().toLowerCase();
    const duplicate = await ServiceCategory.findOne({
      _id: { $ne: id },
      slug: newSlug,
    });

    if (duplicate) {
      throw ApiError.duplicate('Another category already uses this slug');
    }
    category.slug = newSlug;
  }

  if (updateData.description !== undefined) category.description = updateData.description;
  if (updateData.icon !== undefined) category.icon = updateData.icon;
  if (updateData.startingPrice !== undefined) category.startingPrice = updateData.startingPrice;
  if (updateData.pricingUnit !== undefined) category.pricingUnit = updateData.pricingUnit;
  if (updateData.requiredSkills !== undefined) category.requiredSkills = updateData.requiredSkills;
  if (updateData.isActive !== undefined) category.isActive = updateData.isActive;

  await category.save();
  return category;
};

/**
 * Deletes a category only if not referenced by existing service requests
 * @param {string} id
 */
const deleteCategory = async (id) => {
  const category = await ServiceCategory.findById(id);
  if (!category) {
    throw ApiError.notFound('Service category not found');
  }

  // Deletion protection: check historical requests
  const requestCount = await ServiceRequest.countDocuments({ category: id });
  if (requestCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete category "${category.name}" because it is referenced by ${requestCount} service request(s). Please deactivate it instead.`,
      'CATEGORY_IN_USE'
    );
  }

  await ServiceCategory.findByIdAndDelete(id);
  return { id, message: 'Category deleted successfully' };
};

module.exports = {
  generateSlug,
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
