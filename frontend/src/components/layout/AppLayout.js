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
                <button 
                  className="dropdown-toggle" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  aria-label="User menu"
                  aria-expanded={showDropdown}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderRadius: '50%',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <img 
                    src="https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y" 
                    alt="Profile" 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                </button>
                {showDropdown && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <div className="user-info">
                        <div className="user-avatar">
                          <i className="fas fa-user"></i>
                        </div>
                        <div>
                          <div className="user-name">{user.name || user.email}</div>
                          <div className="user-email">{user.email}</div>
                        </div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button 
                      onClick={handleLogout} 
                      className="dropdown-item"
                    >
                      <i className="fas fa-sign-out-alt"></i> Logout
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
