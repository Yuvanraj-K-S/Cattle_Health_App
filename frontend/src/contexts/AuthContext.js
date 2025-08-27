import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
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
      console.log('Login response:', {
        hasToken: !!response?.token,
        hasUserData: !!response?.data?.user,
        userEmail: response?.data?.user?.email
      });
      
      if (!response?.data?.user) {
        throw new Error('Invalid response format from server');
      }
      
      // Set the user in context
      setUser(response.data.user);
      
      // Verify token is in localStorage
      const storedToken = localStorage.getItem('token');
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
      
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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
