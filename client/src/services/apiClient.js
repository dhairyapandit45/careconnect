/**
 * Centralized Axios API Client
 * Configured with request interceptor for JWT auth and response interceptor for 401 handling.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('careconnect_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Standardize errors and handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const { response } = error;

    if (response) {
      // Automatic session purge on 401 Unauthorized (except on login/register)
      if (response.status === 401 && !error.config.url.includes('/auth/login')) {
        localStorage.removeItem('careconnect_token');
        localStorage.removeItem('careconnect_user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login?sessionExpired=true';
        }
      }

      const formattedError = {
        status: response.status,
        message: response.data?.message || 'An unexpected server error occurred',
        code: response.data?.error?.code || 'API_ERROR',
        details: response.data?.error?.details || [],
      };

      return Promise.reject(formattedError);
    }

    // Network or client connection error
    return Promise.reject({
      status: 0,
      message: error.message || 'Network connection error. Server is unreachable.',
      code: 'NETWORK_ERROR',
      details: [],
    });
  }
);

export default apiClient;
