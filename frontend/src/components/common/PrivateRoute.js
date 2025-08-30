import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PrivateRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Debug log
  console.log('PrivateRoute - Auth State:', { 
    isAuthenticated, 
    loading, 
    user: user ? 'User exists' : 'No user',
    currentPath: location.pathname 
  });

  if (loading) {
    console.log('PrivateRoute - Loading authentication state...');
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    console.log('PrivateRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('PrivateRoute - User authenticated, rendering protected content');
  return <Outlet />;
};

export default PrivateRoute;
