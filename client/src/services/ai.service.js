/**
 * AI Frontend Service
 * Centralizes API client methods for:
 * 1. Request category classification with explainable confidence
 * 2. Intelligent provider matching with composite scoring and rationale
 */

import apiClient from './apiClient';

export const aiService = {
  /**
   * Classify a service request title/description into a service category
   * @param {Object} payload - { title, description, text }
   * @returns {Promise<Object>} API response with category, confidence, explanation
   */
  async classifyRequest(payload) {
    return apiClient.post('/ai/classify', payload);
  },

  /**
   * Retrieve intelligent provider matches for a category and location
   * @param {Object} payload - { categoryId, city, preferredDate, urgency, limit }
   * @returns {Promise<Object>} API response with ranked providers and explanations
   */
  async matchProviders(payload) {
    return apiClient.post('/ai/match-providers', payload);
  },
};

export default aiService;
