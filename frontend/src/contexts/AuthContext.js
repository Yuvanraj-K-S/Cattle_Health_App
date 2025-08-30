import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, getCurrentUser, logout as apiLogout } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      console.log('AuthContext - Starting authentication check...');
      try {
        const token = localStorage.getItem('token');
        console.log('AuthContext - Token from localStorage:', token ? 'Token exists' : 'No token');
        
        if (token) {
          console.log('AuthContext - Found token, fetching current user...');
          const currentUser = await getCurrentUser();
          console.log('AuthContext - Current user from API:', currentUser);
          
          if (currentUser) {
            console.log('AuthContext - User authenticated successfully');
            setUser(currentUser);
            setIsAuthenticated(true);
          } else {
            console.log('AuthContext - No valid user found, clearing invalid token');
            localStorage.removeItem('token');
            setIsAuthenticated(false);
          }
        } else {
          console.log('AuthContext - No token found, user is not authenticated');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('AuthContext - Authentication check failed:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      } finally {
        console.log('AuthContext - Authentication check complete');
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      console.log('Attempting login with credentials:', credentials.email);
      const response = await authAPI.login(credentials);
      
      // Log the complete response for debugging
      console.log('Login response:', response);
      
      // Get the user data from the response
      const userData = response.data?.user || response.user;
      
      if (!userData) {
        throw new Error('No user data received in login response');
      }
      
      // Set the user in context
      setUser(userData);
      setIsAuthenticated(true);
      
      // Verify token is in localStorage
      const storedToken = localStorage.getItem('token');
      console.log('Stored token:', storedToken ? 'Token exists' : 'No token found');
      console.log('Token verification - stored in localStorage:', !!storedToken);
      
      return { 
        success: true,
        user: response.data.user 
      };
      
    } catch (error) {
      console.error('Login failed:', error);
      // Clear any existing token on failed login
      localStorage.removeItem('token');
      return { 
        success: false, 
        message: error.message || 'Login failed. Please check your credentials.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token, data: { user } } = response;
      
      // Store the token
      localStorage.setItem('token', token);
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      // Call the API logout function to clear the token
      await apiLogout();
      // Clear user and authentication state
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear user data and token
      setUser(null);
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
