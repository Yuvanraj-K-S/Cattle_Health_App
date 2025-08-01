import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { loadUser } from '@features/auth/authSlice';

// Layout
import MainLayout from '@components/layout/MainLayout';

// Pages
import DashboardPage from '@pages/dashboard/DashboardPage';
import LoginPage from '@pages/auth/LoginPage';
import SettingsPage from '@pages/settings/SettingsPage';
import NotFoundPage from '@pages/NotFoundPage';

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

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);

  // Load user on app mount if token exists
  useEffect(() => {
    if (localStorage.getItem('token')) {
      dispatch(loadUser());
    }
  }, [dispatch]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings/*" element={<SettingsPage />} />
        
        {/* Add more protected routes here */}
        
        {/* 404 - Keep as last route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      
      {/* Catch all other routes */}
      <Route path="*" element={
        isAuthenticated ? (
          <Navigate to="/not-found" replace />
        ) : (
          <Navigate to="/login" state={{ from: window.location.pathname }} replace />
        )
      } />
    </Routes>
  );
};

export default App;
