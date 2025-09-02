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
                  <div 
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: user?.name ? '#4f46e5' : '#f0f4f8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #e0e7ff',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      textTransform: 'uppercase'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                  >
                    {user?.name ? (
                      // Show user initials if name exists
                      user.name.split(' ').map(n => n[0]).join('').substring(0, 2)
                    ) : (
                      // Fallback to user icon if no name
                      <i className="fas fa-user" style={{ color: '#4f46e5' }}></i>
                    )}
                  </div>
                </button>
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
                        <div className="user-avatar" style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: '#4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '18px',
                          flexShrink: 0
                        }}>
                          {user?.name ? (
                            user.name.split(' ').map(n => n[0]).join('').substring(0, 2)
                          ) : (
                            <i className="fas fa-user"></i>
                          )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div className="user-name" style={{
                            fontWeight: '600',
                            fontSize: '15px',
                            color: '#1e293b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {user?.name || 'User'}
                          </div>
                          <div className="user-email" style={{
                            fontSize: '13px',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {user?.email || ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button 
                      onClick={handleLogout} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#1e293b',
                        transition: 'all 0.2s',
                        fontSize: '14px',
                        fontWeight: '500',
                        ':hover': {
                          backgroundColor: '#f8fafc',
                          color: '#4f46e5'
                        }
                      }}
                    >
                      <i className="fas fa-sign-out-alt" style={{ width: '20px', textAlign: 'center' }}></i>
                      <span>Sign out</span>
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
