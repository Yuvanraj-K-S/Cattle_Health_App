/**
 * API utility for making authenticated HTTP requests
 */

const API_BASE_URL = 'http://localhost:3001/api/v1';

// Custom error class for API errors
class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Helper function to handle API requests with authentication
 * @param {string} endpoint - API endpoint (e.g., '/cattle')
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Object>} - Parsed JSON response
 */
export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Parse response as JSON if possible
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else {
      data = await response.text().catch(() => ({}));
    }

    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
      localStorage.removeItem('token');
      // The navigation will be handled by the AuthContext
      throw new ApiError(
        'Session expired. Please log in again.',
        401,
        'UNAUTHORIZED',
        { redirectTo: '/login' }
      );
    }

    // Handle other error statuses
    if (!response.ok) {
      throw new ApiError(
        data.message || 'An unexpected error occurred',
        response.status,
        data.code || 'UNKNOWN_ERROR',
        data.details
      );
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', {
      endpoint,
      options,
      error: {
        name: error.name,
        message: error.message,
        status: error.status,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
    
    // Re-throw the error for the calling code to handle
    throw error;
  }
};

/**
 * GET request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>}
 */
export const get = async (endpoint, params = {}, options = {}) => {
  const queryString = Object.keys(params).length
    ? `?${new URLSearchParams(params).toString()}`
    : '';
  return apiRequest(`${endpoint}${queryString}`, { 
    method: 'GET',
    ...options 
  });
};

/**
 * POST request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>}
 */
export const post = async (endpoint, data = {}, options = {}) => {
  return apiRequest(endpoint, {
    method: 'POST',
    body: data,
    ...options,
  });
};

/**
 * PATCH request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>}
 */
export const patch = async (endpoint, data = {}, options = {}) => {
  return apiRequest(endpoint, {
    method: 'PATCH',
    body: data,
    ...options,
  });
};

/**
 * DELETE request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>}
 */
export const del = async (endpoint, options = {}) => {
  return apiRequest(endpoint, {
    method: 'DELETE',
    ...options,
  });
};

/**
 * Handle file upload with progress
 */
export const uploadFile = async (endpoint, file, onProgress) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let error;
        try {
          error = new Error(JSON.parse(xhr.responseText).message || 'Upload failed');
        } catch (e) {
          error = new Error('Upload failed');
        }
        reject(error);
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    xhr.open('POST', `${API_BASE_URL}${endpoint}`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};
