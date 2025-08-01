import React, { ReactNode } from 'react';
import { Box, AppBar, Toolbar, Typography, Container, CssBaseline } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography 
            variant="h6" 
            component={RouterLink} 
            to="/" 
            sx={{ 
              flexGrow: 1, 
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold'
            }}
          >
            Cattle Health Monitor
          </Typography>
          
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography 
                component={RouterLink} 
                to="/dashboard" 
                sx={{ color: 'white', textDecoration: 'none' }}
              >
                Dashboard
              </Typography>
              <Typography 
                component={RouterLink} 
                to="/settings" 
                sx={{ color: 'white', textDecoration: 'none' }}
              >
                Settings
              </Typography>
              <Typography 
                component={RouterLink} 
                to="/logout" 
                sx={{ color: 'white', textDecoration: 'none' }}
              >
                Logout
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography 
                component={RouterLink} 
                to="/login" 
                sx={{ color: 'white', textDecoration: 'none' }}
              >
                Login
              </Typography>
              <Typography 
                component={RouterLink} 
                to="/register" 
                sx={{ color: 'white', textDecoration: 'none' }}
              >
                Register
              </Typography>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      <Container component="main" sx={{ mt: 4, mb: 4, flex: 1 }}>
        {children}
      </Container>
      
      <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: (theme) => 
        theme.palette.mode === 'light'
          ? theme.palette.grey[200]
          : theme.palette.grey[800],
      }}>
        <Container maxWidth="sm">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Cattle Health Monitor. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;
