import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Chip,
  TablePagination,
  Alert,
  Snackbar
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import type { RootState } from '../../store/store';
import { fetchCattle, selectAllCattle, getCattleStatus, resetAddStatus, getCattleError } from '../../features/cattle/cattleSlice';

const CattleListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const cattle = useAppSelector(selectAllCattle);
  const status = useAppSelector(getCattleStatus);
  const error = useAppSelector(getCattleError);
  const loading = status === 'loading';
  const addStatus = useAppSelector((state: RootState) => state.cattle.addStatus);
  const totalCount = useAppSelector((state: RootState) => state.cattle.count);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch cattle data with pagination and search
  const fetchCattleData = useCallback(() => {
    console.log('Fetching cattle data with params:', { 
      page: page + 1, 
      limit: rowsPerPage,
      search: searchQuery || 'not provided'
    });
    
    dispatch(fetchCattle({ 
      page: page + 1, 
      limit: rowsPerPage,
      ...(searchQuery && { search: searchQuery })
    }))
    .unwrap()
    .then((result) => {
      console.log('Successfully fetched cattle data:', {
        count: result.pagination?.total || result.count || 0,
        items: Array.isArray(result.data) ? result.data.length : 1,
        firstItem: Array.isArray(result.data) ? result.data[0] : result.data
      });
    })
    .catch((error) => {
      console.error('Error fetching cattle data:', error);
    });
  }, [dispatch, page, rowsPerPage, searchQuery]);

  // Log when cattle data changes
  useEffect(() => {
    console.log('Cattle data updated:', {
      count: cattle.length,
      firstItem: cattle[0] ? {
        _id: cattle[0]._id,
        tagId: cattle[0].tagId,
        species: cattle[0].species,
        status: cattle[0].status,
        lastReading: cattle[0].lastReading ? {
          temperature: cattle[0].lastReading.temperature,
          heartRate: cattle[0].lastReading.heartRate,
          sleepDuration: cattle[0].lastReading.sleepDuration,
          lyingDuration: cattle[0].lastReading.lyingDuration,
          location: cattle[0].lastReading.location,
          recordedAt: cattle[0].lastReading.recordedAt
        } : 'No health readings'
      } : 'No cattle data'
    });
  }, [cattle]);

  // Initial fetch and refetch when page/rowsPerPage/searchQuery changes
  useEffect(() => {
    console.log('useEffect triggered - status:', status);
    console.log('Current cattle in store:', cattle);
    
    // Always fetch data when page, rowsPerPage, or searchQuery changes
    fetchCattleData();
    
    // Cleanup function if needed
    return () => {
      console.log('Cleaning up...');
    };
  }, [page, rowsPerPage, searchQuery, fetchCattleData]);

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  // Refresh cattle list after successful addition
  useEffect(() => {
    if (addStatus === 'succeeded') {
      setSnackbarMessage('Cattle added successfully!');
      setSnackbarOpen(true);
      // Refresh the cattle list
      fetchCattleData();
      // Reset the add status
      dispatch(resetAddStatus());
    } else if (addStatus === 'failed') {
      setSnackbarMessage('Failed to add cattle. Please try again.');
      setSnackbarOpen(true);
    }
  }, [addStatus, fetchCattleData, dispatch]);

  // Show loading state
  if (loading && cattle.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (error && cattle.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchCattleData}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Cattle List
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/cattle/add')}
        >
          Add New Cattle
        </Button>
      </Box>

      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tag ID</TableCell>
                <TableCell>Species</TableCell>
                <TableCell>Temperature (°C)</TableCell>
                <TableCell>Heart Rate (bpm)</TableCell>
                <TableCell>Sleep (h)</TableCell>
                <TableCell>Lying (h)</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cattle.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      {status === 'loading' ? 'Loading...' : 'No cattle records found. Add a new cattle to get started.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                cattle.map((cow: any, index: number) => (
                  <TableRow key={cow._id || index} hover>
                    <TableCell>{cow.tagId}</TableCell>
                    <TableCell>{cow.species || '-'}</TableCell>
                    <TableCell>{
                      cow.lastReading?.bodyTemperature 
                        ? `${cow.lastReading.bodyTemperature.toFixed(1)}°C` 
                        : '-'}
                    </TableCell>
                    <TableCell>{
                      cow.lastReading?.heartRate 
                        ? `${cow.lastReading.heartRate} bpm` 
                        : '-'}
                    </TableCell>
                    <TableCell>{
                      cow.lastReading?.sleepDuration 
                        ? `${cow.lastReading.sleepDuration.toFixed(1)}h` 
                        : '-'}
                    </TableCell>
                    <TableCell>{
                      cow.lastReading?.lyingDuration 
                        ? `${cow.lastReading.lyingDuration.toFixed(1)}h` 
                        : '-'}
                    </TableCell>
                    <TableCell>{
                      cow.lastReading?.location || cow.location || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={cow.status} 
                        color={
                          cow.status === 'active' ? 'success' : 
                          cow.status === 'inactive' ? 'default' : 'error'
                        } 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {cow.lastReading?.recordedAt 
                        ? new Date(cow.lastReading.recordedAt).toLocaleString() 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        onClick={() => navigate(`/cattle/${cow._id}`)}
                        size="small"
                        title="View Details"
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      </Paper>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={addStatus === 'succeeded' ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CattleListPage;
