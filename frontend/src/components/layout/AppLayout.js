import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AppLayout.css';

// Debug component to verify rendering
const DebugBanner = ({ user }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    background: 'red',
    color: 'white',
    padding: '10px',
    zIndex: 100, // Lower z-index to be below the header
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    opacity: 0.8 // Make it slightly transparent
  }}>
    {user ? `AppLayout Rendered (${user.email})` : 'AppLayout Rendered (No User)'}
  </div>
);

const AppLayout = ({ children }) => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.user-menu')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Test if component is rendering
  console.log('AppLayout rendering with user:', user);
  
  console.log('AppLayout rendering with user:', user);
  
  console.log('AppLayout rendering with user:', user);
  
  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <DebugBanner user={user} />
      
      {/* Navigation Bar */}
      <header className="app-header" style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '0.75rem 0',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        position: 'fixed',
        width: '100%',
        top: 0,
        zIndex: 1000,
        height: '60px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="container">
          <div className="header-content">
            <Link to="/dashboard" className="logo">
              <h1>Cattle Health</h1>
            </Link>
            
            <nav className="main-nav">
              <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
              <Link to="/cattle" className={location.pathname.startsWith('/cattle') ? 'active' : ''}>Cattle</Link>
            </nav>
            
            {user ? (
              <div className="user-menu">
                <div 
                  className="user-avatar"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  aria-label="User menu"
                  aria-expanded={showDropdown}
                >
                  <span className="username">
                    {user.name || user.email.split('@')[0]}
                  </span>
                  <i className="fas fa-caret-down"></i>
                </div>
                {showDropdown && (
                  <div className="dropdown-menu" style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '8px',
                    minWidth: '220px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div className="dropdown-header" style={{
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <div className="user-info" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div className="user-avatar large">
                          {user.name ? (
                            <span>{user.name.charAt(0).toUpperCase()}</span>
                          ) : (
                            <i className="fas fa-user"></i>
                          )}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.name || 'User'}</div>
                          <div className="user-email">{user.email}</div>
                          {user.role && <div className="user-role">{user.role}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <i className="fas fa-user"></i>
                      <span>My Profile</span>
                    </Link>
                    <Link to="/settings" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <i className="fas fa-cog"></i>
                      <span>Settings</span>
                    </Link>
                    <Link to="/notifications" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <i className="fas fa-bell"></i>
                      <span>Notifications</span>
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item logout" 
                      onClick={(e) => {
                        e.preventDefault();
                        setShowDropdown(false);
                        handleLogout(e);
                      }}
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-links">
                <Link to="/login" className="btn btn-outline">Login</Link>
                <Link to="/register" className="btn btn-primary">Register</Link>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="app-main" style={{ 
        flex: 1,
        padding: '1rem',
        marginTop: '60px' // Add margin to account for fixed header
      }}>
        {children || <Outlet />}
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
