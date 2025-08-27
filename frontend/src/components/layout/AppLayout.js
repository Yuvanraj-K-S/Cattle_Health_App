import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AppLayout.css';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">
              <h1>Cattle Health</h1>
            </Link>
            
            <nav className="main-nav">
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/cattle">Cattle</Link>
            </nav>
            
            <div className="user-menu">
              <span className="user-email">{user?.email}</span>
              <div className="dropdown">
                <button className="dropdown-toggle">
                  <i className="fas fa-user-circle"></i>
                </button>
                <div className="dropdown-menu">
                  <button onClick={handleLogout} className="dropdown-item">
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
      
      <footer className="app-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Cattle Health Monitoring System</p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
