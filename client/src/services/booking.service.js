/**
 * Booking Frontend Service
 * Handles quote acceptance with scheduling, customer booking operations,
 * and provider booking management.
 */

import apiClient from './apiClient';

export const bookingService = {
  /**
   * Accepts a quote and creates a confirmed booking with requested schedule
   * @param {string} requestId
   * @param {string} quoteId
   * @param {Object} scheduleData - { scheduledStart, scheduledEnd }
   */
  async acceptQuoteAndBook(requestId, quoteId, scheduleData) {
    return apiClient.post('/service-requests/' + requestId + '/quotes/' + quoteId + '/accept', scheduleData);
  },

  /**
   * Customer retrieves their bookings with optional status filter and pagination
   * @param {Object} [params] - { status, page, limit }
   */
  async getCustomerBookings(params = {}) {
    return apiClient.get('/bookings', { params });
  },

  /**
   * Customer retrieves a specific booking by ID
   * @param {string} id
   */
  async getCustomerBookingById(id) {
    return apiClient.get('/bookings/' + id);
  },

  /**
   * Customer cancels an existing booking with a mandatory reason
   * @param {string} id
   * @param {Object} data - { reason }
   */
  async cancelCustomerBooking(id, data) {
    return apiClient.post('/bookings/' + id + '/cancel', data);
  },

  /**
   * Provider retrieves assigned bookings with optional status filter and pagination
   * @param {Object} [params] - { status, page, limit }
   */
  async getProviderBookings(params = {}) {
    return apiClient.get('/providers/bookings', { params });
  },

  /**
   * Provider retrieves a specific assigned booking by ID
   * @param {string} id
   */
  async getProviderBookingById(id) {
    return apiClient.get('/providers/bookings/' + id);
  },

  /**
   * Provider cancels an assigned booking with a mandatory reason
   * @param {string} id
   * @param {Object} data - { reason }
   */
  async cancelProviderBooking(id, data) {
    return apiClient.post('/providers/bookings/' + id + '/cancel', data);
  },
};

export default bookingService;
