import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  CircularProgress,
  Button
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { loadUser } from '../../features/auth/authSlice';
import { fetchCattle, getCattleCount } from '../../features/cattle/cattleSlice';

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAppSelector((state) => state.auth);
  const cattleCount = useAppSelector(getCattleCount);
  const cattleStatus = useAppSelector((state) => state.cattle.status);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      // Load user data if not already loaded
      if (!user) {
        dispatch(loadUser());
      }
      // Load cattle data
      if (cattleStatus === 'idle') {
        dispatch(fetchCattle());
      }
    }
  }, [isAuthenticated, navigate, dispatch, user, cattleStatus]);

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
        Dashboard
      </Typography>
      
      <Typography variant="h6" color="text.secondary" paragraph>
        Welcome back, {user.name || 'User'}!
      </Typography>

      <Grid container spacing={3}>
        {/* Overview Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Cattle
              </Typography>
              <Box display="flex" alignItems="center" minHeight={36}>
                {cattleStatus === 'loading' ? (
                  <CircularProgress size={24} />
                ) : (
                  <Typography variant="h5" component="div">
                    {cattleCount}
                  </Typography>
                )}
              </Box>
              <Button 
                size="small" 
                color="primary"
                onClick={() => navigate('/cattle')}
                sx={{ mt: 1 }}
                disabled={cattleCount === 0}
              >
                {cattleCount > 0 ? 'View All' : 'No Cattle'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Health Alerts
              </Typography>
              <Typography variant="h5" component="div" color="error">
                0
              </Typography>
              <Button 
                size="small" 
                color="primary"
                onClick={() => navigate('/alerts')}
                sx={{ mt: 1 }}
              >
                View Alerts
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Upcoming Tasks
              </Typography>
              <Typography variant="h5" component="div">
                0
              </Typography>
              <Button 
                size="small" 
                color="primary"
                onClick={() => navigate('/tasks')}
                sx={{ mt: 1 }}
              >
                View Tasks
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Recent Activity
              </Typography>
              <Typography variant="h5" component="div">
                0
              </Typography>
              <Button 
                size="small" 
                color="primary"
                onClick={() => navigate('/activity')}
                sx={{ mt: 1 }}
              >
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12}>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/cattle/add')}
                >
                  Add New Cattle
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={() => navigate('/health/record')}
                >
                  Record Health Data
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={() => navigate('/tasks/create')}
                >
                  Create Task
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Cattle
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No recent cattle records found.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;
