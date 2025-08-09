import axios from 'axios';

// Log environment variables for debugging
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  PUBLIC_URL: process.env.PUBLIC_URL
});

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3002/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies/sessions
  timeout: 10000, // 10 second timeout
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()}: ${config.url}`, {
      data: config.data,
      params: config.params,
      headers: config.headers
    });
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // For cattle list endpoint, log the full response data
    if (response.config.url?.includes('/cattle')) {
      console.log(`[API] Full Response for ${response.config.url}:`, JSON.parse(JSON.stringify(response.data)));
    }
    
    console.log(`[API] Response ${response.status}: ${response.config.url}`, {
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    const errorDetails = {
      message: error.message,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
        headers: error.config?.headers,
      },
      response: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      },
    };

    console.error('[API] Response error:', errorDetails);

    // Handle specific error statuses
    if (error.response) {
      // Server responded with a status code outside 2xx
      if (error.response.status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('token');
        // Only redirect if not already on login page to avoid infinite loop
        if (!window.location.pathname.includes('/login')) {
          const currentPath = window.location.pathname + window.location.search;
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      } else if (error.response.status === 403) {
        // Forbidden - redirect to login with error state
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?error=forbidden';
        }
      } else if (error.response.status === 404) {
        console.error('The requested resource was not found.');
      } else if (error.response.status >= 500) {
        console.error('A server error occurred. Please try again later.');
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received from server. Please check your connection.');
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
