import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Tabs, 
  Tab, 
  Divider,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`,
  };
}

const SettingsPage: React.FC = () => {
  const [value, setValue] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, loading } = useAppSelector((state) => state.auth);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const showSuccess = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const showError = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  };

  if (loading || !user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your account and application preferences
      </Typography>

      <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', minHeight: '60vh' }}>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={value}
          onChange={handleChange}
          aria-label="Settings tabs"
          sx={{ borderRight: 1, borderColor: 'divider', minWidth: 200 }}
        >
          <Tab label="Profile" {...a11yProps(0)} />
          <Tab label="Account" {...a11yProps(1)} />
          <Tab label="Notifications" {...a11yProps(2)} />
          <Tab label="Security" {...a11yProps(3)} />
          <Tab label="Preferences" {...a11yProps(4)} />
          <Divider sx={{ my: 1 }} />
          <Tab 
            label="Logout" 
            onClick={handleLogout}
            sx={{ color: 'error.main', mt: 'auto' }}
          />
        </Tabs>
        
        <Box sx={{ flexGrow: 1, ml: 3 }}>
          <TabPanel value={value} index={0}>
            <Typography variant="h6" gutterBottom>
              Profile Information
            </Typography>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="body1">
                <strong>Name:</strong> {user.name || 'Not set'}
              </Typography>
              <Typography variant="body1" sx={{ mt: 2 }}>
                <strong>Email:</strong> {user.email || 'Not set'}
              </Typography>
              {/* Add profile update form here */}
            </Paper>
          </TabPanel>
          
          <TabPanel value={value} index={1}>
            <Typography variant="h6" gutterBottom>
              Account Settings
            </Typography>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="body1">
                Account management options will be available here.
              </Typography>
            </Paper>
          </TabPanel>
          
          <TabPanel value={value} index={2}>
            <Typography variant="h6" gutterBottom>
              Notification Preferences
            </Typography>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="body1">
                Configure how you receive notifications.
              </Typography>
            </Paper>
          </TabPanel>
          
          <TabPanel value={value} index={3}>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="body1" gutterBottom>
                Manage your account security settings, including password changes and two-factor authentication.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Security features will be implemented soon.
              </Typography>
            </Paper>
          </TabPanel>
          
          <TabPanel value={value} index={4}>
            <Typography variant="h6" gutterBottom>
              Application Preferences
            </Typography>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="body1">
                Customize your application experience.
              </Typography>
            </Paper>
          </TabPanel>
        </Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage;
