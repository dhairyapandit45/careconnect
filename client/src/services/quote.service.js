/**
 * Quote Frontend Service
 * Handles quote creation, retrieval, withdrawal, acceptance, and provider job opportunity discovery.
 */

import apiClient from './apiClient';

export const quoteService = {
  /**
   * Submits a new quote for a service request (Provider only)
   * @param {string} requestId
   * @param {Object} data - { amount, currency, estimatedDuration, description, validUntil }
   */
  async createQuote(requestId, data) {
    return apiClient.post(`/service-requests/${requestId}/quotes`, data);
  },

  /**
   * Retrieves quotes for a service request (Customer only)
   * @param {string} requestId
   */
  async getQuotesForRequest(requestId) {
    return apiClient.get(`/service-requests/${requestId}/quotes`);
  },

  /**
   * Customer accepts a provider quote
   * @param {string} requestId
   * @param {string} quoteId
   */
  async acceptQuote(requestId, quoteId) {
    return apiClient.patch(`/service-requests/${requestId}/quotes/${quoteId}/accept`);
  },

  /**
   * Lists quotes submitted by the authenticated provider
   * @param {Object} [params] - { page, limit, status }
   */
  async getProviderQuotes(params = {}) {
    return apiClient.get('/providers/quotes', { params });
  },

  /**
   * Retrieves a single provider quote by ID
   * @param {string} id
   */
  async getProviderQuoteById(id) {
    return apiClient.get(`/providers/quotes/${id}`);
  },

  /**
   * Provider withdraws a submitted quote
   * @param {string} id
   */
  async withdrawQuote(id) {
    return apiClient.patch(`/providers/quotes/${id}/withdraw`);
  },

  /**
   * Retrieves eligible service requests for the authenticated provider
   * @param {Object} [params] - { page, limit, category, search }
   */
  async getEligibleRequests(params = {}) {
    return apiClient.get('/provider-requests', { params });
  },

  /**
   * Retrieves a single eligible request detail for the provider
   * @param {string} id
   */
  async getEligibleRequestById(id) {
    return apiClient.get(`/provider-requests/${id}`);
  },
};

export default quoteService;
