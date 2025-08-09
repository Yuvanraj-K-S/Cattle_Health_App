import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { login, clearError } from '../../features/auth/authSlice';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Link,
  Alert,
  CircularProgress,
  AlertTitle,
} from '@mui/material';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, error } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  
  // Check for error query parameter
  const errorType = searchParams.get('error');
  const redirectPath = searchParams.get('redirect');
  
  // State for showing error alerts
  const [showForbiddenAlert, setShowForbiddenAlert] = useState(errorType === 'forbidden');
  const [showSessionExpired, setShowSessionExpired] = useState(errorType === 'session_expired');

  // Clear any previous errors and handle query parameters when component mounts
  useEffect(() => {
    dispatch(clearError());
    
    // If there's a redirect parameter, save it to session storage
    if (redirectPath) {
      sessionStorage.setItem('redirectAfterLogin', redirectPath);
    }
    
    // Clear URL parameters to prevent showing alerts on refresh
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [dispatch, redirectPath]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectTo);
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for the field being edited
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      dispatch(login({ 
        email: formData.email, 
        password: formData.password 
      }));
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Sign in to Cattle Health
          </Typography>
          
          {/* Forbidden Alert */}
          {showForbiddenAlert && (
            <Alert 
              severity="warning" 
              sx={{ mb: 2 }}
              onClose={() => setShowForbiddenAlert(false)}
            >
              <AlertTitle>Access Denied</AlertTitle>
              You don't have permission to access that page. Please log in with an account that has the required permissions.
            </Alert>
          )}
          
          {/* Session Expired Alert */}
          {showSessionExpired && (
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
              onClose={() => setShowSessionExpired(false)}
            >
              <AlertTitle>Session Expired</AlertTitle>
              Your session has expired. Please log in again to continue.
            </Alert>
          )}
          
          {/* API Error Alert */}
          {error && !showForbiddenAlert && !showSessionExpired && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              onClose={() => dispatch(clearError())}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              error={!!formErrors.email}
              helperText={formErrors.email}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              error={!!formErrors.password}
              helperText={formErrors.password}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/forgot-password" variant="body2">
                Forgot password?
              </Link>
            </Box>
          </Box>
        </Paper>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" variant="body2">
              Sign up
            </Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
