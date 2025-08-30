import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CattleProvider } from './contexts/CattleContext';
import PrivateRoute from './components/common/PrivateRoute';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CattleList from './pages/cattle/CattleList';
import CattleDetail from './pages/cattle/CattleDetail';
import CattleForm from './pages/cattle/CattleForm';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CattleProvider>
          <div className="App">
            <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="cattle" element={<CattleList />} />
                <Route path="cattle/new" element={<CattleForm />} />
                <Route path="cattle/:id" element={<CattleDetail />} />
              </Route>
            </Route>
            
            {/* 404 Route */}
            <Route path="*" element={
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>404 - Page Not Found</h2>
                <p>The page you are looking for does not exist.</p>
              </div>
            } />
          </Routes>
          </div>
        </CattleProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
