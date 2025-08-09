import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { loadUser } from './features/auth/authSlice';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import SettingsPage from './pages/settings/SettingsPage';
import AddCattlePage from './pages/cattle/AddCattlePage';
import CattleListPage from './pages/cattle/CattleListPage';
import NotFoundPage from './pages/NotFoundPage';

// Types
type ProtectedRouteProps = {
  children: React.ReactNode;
  isAuthenticated: boolean;
  loading: boolean;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  isAuthenticated, 
  loading 
}) => {
  const location = useLocation();
  const [timeoutReached, setTimeoutReached] = React.useState(false);

  // Set a timeout to prevent infinite loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout reached. Forcing state update.');
        setTimeoutReached(true);
      }
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timer);
  }, [loading]);

  // If we're still loading and haven't timed out yet, show loading indicator
  if (loading && !timeoutReached) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '1rem' }}>Loading application...</div>
          <div style={{ width: '100%', height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px' }}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              backgroundColor: '#1976d2',
              animation: 'pulse 1.5s ease-in-out infinite',
              borderRadius: '2px'
            }}></div>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we've timed out but are somehow still loading, proceed anyway
  if (timeoutReached && loading) {
    console.warn('Loading timeout reached. Proceeding with potentially incomplete data.');
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
  const [initialLoad, setInitialLoad] = useState(true);

  // Load user on app mount if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await dispatch(loadUser()).unwrap();
        } catch (error) {
          console.error('Failed to load user:', error);
          // Clear invalid token
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setInitialLoad(false);
    };

    initializeAuth();
  }, [dispatch]);

  // Show loading state only during initial auth check
  if (initialLoad) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography>Loading application...</Typography>
      </Box>
    );
  }

  // Create a wrapper component for protected routes
  const ProtectedLayout = () => (
    <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </ProtectedRoute>
  );

  return (
    <Routes>
      {/* Public Routes - Must come first */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
      } />
      
      {/* Not Found Route - Accessible to all */}
      <Route path="/not-found" element={
        <MainLayout>
          <NotFoundPage />
        </MainLayout>
      } />
      
      {/* Root route - Redirects to dashboard */}
      <Route path="/" element={
        isAuthenticated ? (
          <Navigate to="/dashboard" replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      {/* Protected Routes */}
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings/*" element={<SettingsPage />} />
        <Route path="/cattle" element={<CattleListPage />} />
        <Route path="/cattle/add" element={<AddCattlePage />} />
      </Route>
      
      {/* Catch all other routes */}
      <Route 
        path="*" 
        element={
          isAuthenticated ? (
            <Navigate to="/not-found" replace />
          ) : (
            <Navigate to="/login" state={{ from: window.location.pathname }} replace />
          )
        } 
      />
    </Routes>
  );
};

export default App;
