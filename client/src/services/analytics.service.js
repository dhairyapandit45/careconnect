/**
 * Analytics API Service
 * Handles communication with Milestone 9C Admin and Operations Analytics endpoints.
 */

import apiClient from './apiClient';

export const analyticsService = {
  /**
   * Consolidated Platform Analytics Overview
   * @param {Object} [params] - { startDate, endDate }
   * @param {boolean} [isOps=false]
   */
  async getOverview(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/analytics/overview' : '/admin/analytics/overview';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Booking Trends (daily timeline + total/completed/cancelled rates)
   * @param {Object} [params] - { startDate, endDate }
   * @param {boolean} [isOps=false]
   */
  async getBookingTrends(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/analytics/bookings' : '/admin/analytics/bookings';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Revenue Trends (daily timeline + paid vs invoiced amounts)
   * @param {Object} [params] - { startDate, endDate }
   * @param {boolean} [isOps=false]
   */
  async getRevenueTrends(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/analytics/revenue' : '/admin/analytics/revenue';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Provider Performance Rankings
   * @param {Object} [params] - { startDate, endDate, limit }
   * @param {boolean} [isOps=false]
   */
  async getProviderPerformance(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/analytics/providers' : '/admin/analytics/providers';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Category Demand Rankings
   * @param {Object} [params] - { startDate, endDate }
   * @param {boolean} [isOps=false]
   */
  async getCategoryDemand(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/analytics/categories' : '/admin/analytics/categories';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Dispute Analytics Trends & Resolutions
   * @param {Object} [params] - { startDate, endDate }
   * @param {boolean} [isOps=false]
   */
  async getDisputeTrends(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/analytics/disputes' : '/admin/analytics/disputes';
    return apiClient.get(endpoint, { params });
  },

  /**
   * Support Ticket Analytics Trends & SLA
   * @param {Object} [params] - { startDate, endDate }
   * @param {boolean} [isOps=false]
   */
  async getSupportTrends(params = {}, isOps = false) {
    const endpoint = isOps ? '/operations/analytics/support' : '/admin/analytics/support';
    return apiClient.get(endpoint, { params });
  },
};

export default analyticsService;
