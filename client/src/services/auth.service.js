/**
 * Frontend Authentication Service
 */

import apiClient from './apiClient';

export const authService = {
  /**
   * Registers a new account
   * @param {Object} userData - { name, email, password, phone, role }
   */
  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    if (response.data?.token) {
      localStorage.setItem('careconnect_token', response.data.token);
      localStorage.setItem('careconnect_user', JSON.stringify(response.data.user));
    }
    return response;
  },

  /**
   * Authenticates user credentials
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.data?.token) {
      localStorage.setItem('careconnect_token', response.data.token);
      localStorage.setItem('careconnect_user', JSON.stringify(response.data.user));
    }
    return response;
  },

  /**
   * Retrieves profile of current authenticated principal
   */
  async getCurrentUser() {
    return apiClient.get('/auth/me');
  },

  /**
   * Clears session locally and notifies backend
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Continue client cleanup regardless of network error
    } finally {
      localStorage.removeItem('careconnect_token');
      localStorage.removeItem('careconnect_user');
    }
  },

  /**
   * Gets cached local user if available
   */
  getStoredUser() {
    try {
      const user = localStorage.getItem('careconnect_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  /**
   * Gets cached token
   */
  getStoredToken() {
    return localStorage.getItem('careconnect_token');
  },
};

export default authService;
