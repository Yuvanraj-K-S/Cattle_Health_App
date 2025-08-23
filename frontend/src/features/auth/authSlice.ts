import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';
import { RootState } from '../../store/store';

// Helper functions for localStorage operations
const setStoredUser = (user: User | null) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      farms: user.farms,
      defaultFarm: user.defaultFarm
    }));
  } else {
    localStorage.removeItem('user');
  }
};

const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Helper function to handle token in localStorage and apiClient headers
const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Add axios interceptor to handle 401 responses and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is not 401 or we've already tried to refresh, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Mark that we've tried to refresh
    originalRequest._retry = true;

    try {
      // Try to refresh the token
      const response = await apiClient.post('/api/v1/auth/refresh-token', {}, {
        withCredentials: true // Important for sending HTTP-only cookies
      });
      
      const { token } = response.data;
      
      // Update the stored token
      setAuthToken(token);
      
      // Update the Authorization header
      originalRequest.headers.Authorization = `Bearer ${token}`;
      
      // Retry the original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      // If refresh fails, clear auth state
      setAuthToken(null);
      return Promise.reject(refreshError);
    }
  }
);

interface FarmReference {
  farm: {
    _id: string;
    name: string;
  };
  role: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  farms?: FarmReference[];
  defaultFarm?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  refreshToken: string | null;
  isRefreshing: boolean;
  lastActivity: number | null;
}

const initialState: AuthState = {
  user: getStoredUser(),
  token: localStorage.getItem('token'),
  refreshToken: null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  isRefreshing: false,
  lastActivity: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.error = null;
      setAuthToken(token);
      setStoredUser(user);
    },
    tokenRefreshed: (state, action: PayloadAction<{ token: string }>) => {
      state.token = action.payload.token;
      state.isRefreshing = false;
      setAuthToken(action.payload.token);
    },
    refreshTokenFailed: (state) => {
      state.isRefreshing = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      setAuthToken(null);
      setStoredUser(null);
    },
    activityDetected: (state) => {
      state.lastActivity = Date.now();
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      setAuthToken(action.payload.token);
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload as string || 'Registration failed';
      setAuthToken(null);
    });

    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      setAuthToken(action.payload.token);
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload as string || 'Login failed';
      setAuthToken(null);
    });

    // Load User
    builder.addCase(loadUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loadUser.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload as User;
      state.error = null;
    });
    builder.addCase(loadUser.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload as string || 'Failed to load user';
      setAuthToken(null);
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = null;
      setAuthToken(null);
    });
  },
});

// Export actions
export const { 
  clearError, 
  setCredentials, 
  tokenRefreshed, 
  refreshTokenFailed, 
  activityDetected 
} = authSlice.actions;

// Async thunks
// Registration thunk
export const register = createAsyncThunk<
  { user: User; token: string },
  { 
    username: string;
    email: string; 
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }
>('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await apiClient.post('/api/v1/auth/register', {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone || '',
      farmName: userData.farmName || 'My Farm',
      farmAddress: userData.farmAddress || ''
    });
    
    if (response.data && response.data.user && response.data.token) {
      return response.data;
    }
    return rejectWithValue('Invalid response from server');
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 
                       error.message || 
                       'Registration failed. Please try again.';
    return rejectWithValue(errorMessage);
  }
});

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue, dispatch }) => {
    try {
      const response = await apiClient.post('/api/v1/auth/login', credentials);
      const { token, user } = response.data;
      
      // Set the token in the axios headers
      setAuthToken(token);
      
      // Store user data in localStorage
      setStoredUser(user);
      
      // Start session timeout if token has expiration
      if (response.data.expiresIn) {
        dispatch(checkAuthTimeout(response.data.expiresIn));
      }
      
      return { user, token };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const loadUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string; state: { auth: AuthState } }
>('auth/loadUser', async (_, { rejectWithValue, getState }) => {
  try {
    const { auth } = getState();
    const token = localStorage.getItem('token');
    
    // If no token is present, we're not logged in
    if (!token) {
      return rejectWithValue('No authentication token found');
    }
    
    // Only fetch user data if we don't already have it
    if (!auth.user) {
      const response = await apiClient.get('/api/v1/auth/me');
      if (!response.data || !response.data.user) {
        throw new Error('Invalid user data received');
      }
      return response.data.user;
    }
    
    return auth.user;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 
                       error.message || 
                       'Failed to load user data';
    return rejectWithValue(errorMessage);
  }
});

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, dispatch }) => {
    try {
      const { auth } = getState() as { auth: AuthState };
      
      // Don't refresh if already refreshing
      if (auth.isRefreshing) {
        return null;
      }
      
      const response = await apiClient.post('/auth/refresh-token', {}, {
        withCredentials: true // Important for sending HTTP-only cookies
      });
      
      if (response.data && response.data.token) {
        dispatch(tokenRefreshed({ token: response.data.token }));
        return response.data.token;
      }
      
      throw new Error('Invalid token refresh response');
    } catch (error) {
      dispatch(refreshTokenFailed());
      throw error;
    }
  }
);

export const checkAuthTimeout = (expirationTime: number) => (dispatch: any) => {
  setTimeout(() => {
    dispatch(refreshToken())
      .then(() => {
        // If refresh is successful, set a new timeout
        dispatch(checkAuthTimeout(expirationTime));
      })
      .catch(() => {
        // If refresh fails, log the user out
        dispatch(logout());
      });
  }, expirationTime * 1000 - 60000); // Refresh 1 minute before expiration
};

export const logout = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try {
    await apiClient.post('/api/v1/auth/logout', {}, { withCredentials: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Continue with logout even if the server request fails
  } finally {
    // Clear all auth state
    setAuthToken(null);
    // Clear any stored user data
    localStorage.removeItem('user');
    // Reset the state
    dispatch(refreshTokenFailed());
    return null;
  }
});

// Define the return type for the initializeAuth thunk
type InitializeAuthReturn = Promise<void>;

export const initializeAuth = createAsyncThunk<InitializeAuthReturn, void, { state: { auth: AuthState } }>(
  'auth/initialize',
  async (_, { dispatch }) => {
    // Check if we have a token but no user data
    const token = localStorage.getItem('token');
    
    if (token) {
      // Set the token in the axios headers
      setAuthToken(token);
      
      try {
        // Try to get the user data
        const result = await dispatch(loadUser());
        
        // Check if the action was fulfilled
        if (loadUser.fulfilled.match(result)) {
          // Set up activity tracking
          window.addEventListener('click', () => dispatch(activityDetected()));
          window.addEventListener('keypress', () => dispatch(activityDetected()));
          
          // Set up token refresh
          const expiresIn = 60 * 60 * 1000; // 1 hour in milliseconds
          dispatch(checkAuthTimeout(expiresIn / 1000));
        } else if (loadUser.rejected.match(result)) {
          // If loading user fails, log out
          await dispatch(logout());
        }
      } catch (error) {
        // If any error occurs, log out
        await dispatch(logout());
        throw error;
      }
    }
    
    return Promise.resolve();
  }
);

// Export the reducer
export default authSlice.reducer;
