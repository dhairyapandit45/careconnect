/**
 * ServiceCategory Frontend Service
 * Centralizes category fetching and admin category mutation.
 */

import apiClient from './apiClient';

export const categoryService = {
  /**
   * Fetches service categories (active only by default; all if admin requests includeInactive)
   * @param {Object} [options]
   * @param {boolean} [options.includeInactive]
   */
  async getCategories({ includeInactive = false } = {}) {
    return apiClient.get('/categories', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
  },

  /**
   * Fetches single category details
   * @param {string} id
   */
  async getCategoryById(id) {
    return apiClient.get(`/categories/${id}`);
  },

  /**
   * Admin: Creates a new service category
   * @param {Object} data
   */
  async createCategory(data) {
    return apiClient.post('/categories', data);
  },

  /**
   * Admin: Updates an existing service category
   * @param {string} id
   * @param {Object} data
   */
  async updateCategory(id, data) {
    return apiClient.patch(`/categories/${id}`, data);
  },

  /**
   * Admin: Deletes a service category (if unreferenced)
   * @param {string} id
   */
  async deleteCategory(id) {
    return apiClient.delete(`/categories/${id}`);
  },
};

export default categoryService;
