/**
 * Admin & Operations Frontend Service
 * Handles communication with Milestone 9A admin and operations API endpoints.
 */

import apiClient from './apiClient';

export const adminService = {
  /**
   * Platform Statistics
   * @param {Object} [params] - { startDate, endDate }
   * @param {boolean} [isOps=false] - If true, calls /operations/stats
   */
  async getStats(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/stats' : '/admin/stats';
    return apiClient.get(endpoint, { params });
  },

  /**
   * User Management: List platform users
   * @param {Object} [params] - { page, limit, role, status, search }
   * @param {boolean} [isOps=false]
   */
  async listUsers(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/users' : '/admin/users';
    return apiClient.get(endpoint, { params });
  },

  /**
   * User Management: Get user detail
   * @param {string} id
   * @param {boolean} [isOps=false]
   */
  async getUserById(id, isOps = false) {
    const endpoint = isOps ? `/operations/users/${id}` : `/admin/users/${id}`;
    return apiClient.get(endpoint);
  },

  /**
   * User Management: Update account status
   * @param {string} id
   * @param {Object} data - { status, reason }
   * @param {boolean} [isOps=false]
   */
  async updateUserStatus(id, data, isOps = false) {
    const endpoint = isOps ? `/operations/users/${id}/status` : `/admin/users/${id}/status`;
    return apiClient.patch(endpoint, data);
  },

  /**
   * Provider Operations: List service providers
   * @param {Object} [params] - { page, limit, verificationStatus, serviceCategory, city }
   * @param {boolean} [isOps=false]
   */
  async listProviders(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/providers' : '/admin/providers';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Provider Operations: Get provider profile
   * @param {string} id
   * @param {boolean} [isOps=false]
   */
  async getProviderById(id, isOps = false) {
    const endpoint = isOps ? `/operations/providers/${id}` : `/admin/providers/${id}`;
    return apiClient.get(endpoint);
  },

  /**
   * Provider Operations: Review & transition verification status
   * @param {string} id
   * @param {Object} data - { action, status, reason, notes }
   * @param {boolean} [isOps=false]
   */
  async verifyProvider(id, data, isOps = false) {
    const endpoint = isOps ? `/operations/providers/${id}/verification` : `/admin/providers/${id}/verification`;
    return apiClient.patch(endpoint, data);
  },

  /**
   * Bookings Operational Oversight
   * @param {Object} [params] - { page, limit, status, startDate, endDate, provider, customer }
   * @param {boolean} [isOps=false]
   */
  async listBookings(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/bookings' : '/admin/bookings';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Bookings Operational Detail
   * @param {string} id
   * @param {boolean} [isOps=false]
   */
  async getBookingById(id, isOps = false) {
    const endpoint = isOps ? `/operations/bookings/${id}` : `/admin/bookings/${id}`;
    return apiClient.get(endpoint);
  },

  /**
   * Jobs Operational Oversight
   * @param {Object} [params] - { page, limit, status, startDate, endDate, provider, customer }
   * @param {boolean} [isOps=false]
   */
  async listJobs(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/jobs' : '/admin/jobs';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Jobs Operational Detail
   * @param {string} id
   * @param {boolean} [isOps=false]
   */
  async getJobById(id, isOps = false) {
    const endpoint = isOps ? `/operations/jobs/${id}` : `/admin/jobs/${id}`;
    return apiClient.get(endpoint);
  },

  /**
   * Disputes Oversight
   * @param {Object} [params] - { page, limit, status }
   * @param {boolean} [isOps=false]
   */
  async listDisputes(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/disputes' : '/admin/disputes';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Disputes Oversight Detail
   * @param {string} id
   * @param {boolean} [isOps=false]
   */
  async getDisputeById(id, isOps = false) {
    const endpoint = isOps ? `/operations/disputes/${id}` : `/admin/disputes/${id}`;
    return apiClient.get(endpoint);
  },

  /**
   * Support Tickets Oversight
   * @param {Object} [params] - { page, limit, status, priority, category }
   * @param {boolean} [isOps=false]
   */
  async listTickets(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/tickets' : '/admin/tickets';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Support Tickets Detail
   * @param {string} id
   * @param {boolean} [isOps=false]
   */
  async getTicketById(id, isOps = false) {
    const endpoint = isOps ? `/operations/tickets/${id}` : `/admin/tickets/${id}`;
    return apiClient.get(endpoint);
  },
};

export default adminService;
