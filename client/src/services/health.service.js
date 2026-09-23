/**
 * Health Check API Service
 */

import apiClient from './apiClient';

export const healthService = {
  async getHealth() {
    return apiClient.get('/health');
  },
};

export default healthService;
