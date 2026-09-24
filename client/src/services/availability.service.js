/**
 * Provider Availability Service
 * Communicates with backend provider availability APIs.
 */

import apiClient from './apiClient';

export const availabilityService = {
  /**
   * Retrieves all weekly availability shifts for authenticated provider
   */
  async getAvailability() {
    return apiClient.get('/providers/availability');
  },

  /**
   * Creates a new availability slot
   * @param {Object} data - { dayOfWeek, startTime, endTime, isAvailable, isBlocked, blockedDate }
   */
  async createAvailability(data) {
    return apiClient.post('/providers/availability', data);
  },

  /**
   * Updates an existing availability slot
   * @param {string} id
   * @param {Object} data
   */
  async updateAvailability(id, data) {
    return apiClient.patch(`/providers/availability/${id}`, data);
  },

  /**
   * Deletes an availability slot
   * @param {string} id
   */
  async deleteAvailability(id) {
    return apiClient.delete(`/providers/availability/${id}`);
  },
};

export default availabilityService;
