/**
 * ServiceRequest Frontend Service
 * Centralizes customer service request submission and inquiry operations.
 */

import apiClient from './apiClient';

export const serviceRequestService = {
  /**
   * Submits a new customer service request
   * @param {Object} data - { categoryId, title, description, address, city, postalCode, state, preferredDate, preferredTime, requiredSkills }
   */
  async createServiceRequest(data) {
    return apiClient.post('/service-requests', data);
  },

  /**
   * Retrieves list of service requests with pagination and optional filters
   * @param {Object} [params] - { page, limit, status, category, dateFrom, dateTo }
   */
  async getServiceRequests(params = {}) {
    return apiClient.get('/service-requests', { params });
  },

  /**
   * Retrieves single service request by ID
   * @param {string} id
   */
  async getServiceRequestById(id) {
    return apiClient.get(`/service-requests/${id}`);
  },
};

export default serviceRequestService;
