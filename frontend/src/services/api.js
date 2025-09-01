const API_BASE_URL = 'http://localhost:3001/api/v1';

// Helper function to handle API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Don't stringify the body here since it's already stringified in the authAPI.register function
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      body: options.body, // Remove JSON.stringify here since it's already stringified
    });

    // Check if response has content before parsing as JSON
    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else if (response.status === 204) { // No content
      responseData = {};
    } else {
      const text = await response.text();
      responseData = text ? JSON.parse(text) : {};
    }

    if (!response.ok) {
      const error = new Error(responseData.message || 'Something went wrong');
      error.status = response.status;
      error.response = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    console.error('API Request Error:', {
      endpoint,
      error: error.message,
      status: error.status,
      response: error.response
    });
    throw error;
  }
};

// Auth API
export const authAPI = {
  register: (userData) => 
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Store the token from the response
    if (data && data.token) {
      localStorage.setItem('token', data.token);
      console.log('Token stored in localStorage:', data.token.substring(0, 20) + '...');
    } else {
      console.error('No token received in login response');
      throw new Error('No authentication token received');
    }
    
    // Return the complete response data
    return data;
  },
};

// Cattle API
export const cattleAPI = {
  getAllCattle: () => apiRequest('/cattle'),
  
  getCattle: (id) => apiRequest(`/cattle/${id}`),
  
  createCattle: (data) => 
    apiRequest('/cattle', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateCattle: (id, data) => 
    apiRequest(`/cattle/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  deleteCattle: (id) => 
    apiRequest(`/cattle/${id}`, {
      method: 'DELETE',
    }),
  
  addHealthReading: (id, readingData) => 
    apiRequest(`/cattle/${id}/readings`, {
      method: 'POST',
      body: JSON.stringify(readingData),
    }),
  
  getHealthReadings: (id, limit) => 
    apiRequest(`/cattle/${id}/readings${limit ? `?limit=${limit}` : ''}`),
  
  getCattleStats: () => apiRequest('/cattle/stats'),
  
  analyzeHealth: (healthData) => 
    fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(healthData),
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.message || 'Failed to analyze health data');
        });
      }
      return response.json();
    }),
    
  resetCattleHealth: (id) => 
    apiRequest(`/cattle/${id}/reset-health`, {
      method: 'PATCH',
    }),
};

// Auth helper functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    // Ensure the payload has the expected structure
    return {
      id: payload.id,
      farm_id: payload.farmId, // Map farmId to farm_id for consistency
      farmId: payload.farmId,  // Keep both for backward compatibility
      iat: payload.iat,
      exp: payload.exp
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};
