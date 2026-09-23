/**
 * Provider Frontend Service
 * Centralizes service provider profile onboarding, retrieval, updates, and admin verification operations.
 */

import apiClient from './apiClient';

export const providerService = {
  /**
   * Retrieves current authenticated provider's profile
   */
  async getMyProfile() {
    return apiClient.get('/providers/me');
  },

  /**
   * Retrieves provider public/safe profile by ID
   * @param {string} id
   */
  async getProfileById(id) {
    return apiClient.get(`/providers/${id}`);
  },

  /**
   * Retrieves aggregated skills catalog from active service categories
   */
  async getSkillsCatalog() {
    return apiClient.get('/providers/skills');
  },

  /**
   * Creates new provider profile (onboarding)
   * @param {Object} data
   */
  async createProfile(data) {
    return apiClient.post('/providers/profile', data);
  },

  /**
   * Updates existing provider profile
   * @param {Object} data
   */
  async updateProfile(data) {
    return apiClient.put('/providers/profile', data);
  },

  /**
   * Admin: List providers with pagination and filters
   * @param {Object} [params] - { page, limit, status, search, category }
   */
  async getProvidersAdmin(params = {}) {
    return apiClient.get('/admin/providers', { params });
  },

  /**
   * Admin: Retrieve full provider details including documents & notes
   * @param {string} id
   */
  async getProviderAdminById(id) {
    return apiClient.get(`/admin/providers/${id}`);
  },

  /**
   * Admin: Verify provider (APPROVE, REJECT, SUSPEND, REQUEST_REVIEW)
   * @param {string} id
   * @param {Object} data - { action, notes }
   */
  async verifyProviderAdmin(id, data) {
    return apiClient.patch(`/admin/providers/${id}/verification`, data);
  },
};

export default providerService;
