import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Container, 
  MenuItem, 
  Paper, 
  Select, 
  SelectChangeEvent, 
  TextField, 
  Typography,
  Grid,
  FormHelperText
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { addCattle } from '../../features/cattle/cattleSlice';
import { RootState } from '../../store/store';

const AddCattlePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  interface FormData {
    tagId: string;
    species: string;
    bodyTemperature: string;
    heartRate: string;
    sleepDuration: string;
    lyingDuration: string;
    location: string;
    notes: string;
  }

  const [formData, setFormData] = useState<FormData>({
    tagId: '',
    species: 'cow',
    bodyTemperature: '',
    heartRate: '',
    sleepDuration: '',
    lyingDuration: '',
    location: '',
    notes: ''
  });
  
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.tagId.trim()) {
      newErrors.tagId = 'Tag ID is required';
    }
    
    if (!formData.species) {
      newErrors.species = 'Species is required';
    }
    
    // Health reading validations
    if (!formData.bodyTemperature) {
      newErrors.bodyTemperature = 'Body temperature is required';
    } else if (isNaN(Number(formData.bodyTemperature)) || Number(formData.bodyTemperature) <= 0) {
      newErrors.bodyTemperature = 'Please enter a valid temperature';
    } else if (Number(formData.bodyTemperature) < 30 || Number(formData.bodyTemperature) > 45) {
      newErrors.bodyTemperature = 'Temperature must be between 30°C and 45°C';
    }
    
    if (!formData.heartRate) {
      newErrors.heartRate = 'Heart rate is required';
    } else if (isNaN(Number(formData.heartRate)) || Number(formData.heartRate) <= 0) {
      newErrors.heartRate = 'Please enter a valid heart rate';
    } else if (Number(formData.heartRate) < 30 || Number(formData.heartRate) > 120) {
      newErrors.heartRate = 'Heart rate must be between 30 and 120 bpm';
    }
    
    if (!formData.sleepDuration) {
      newErrors.sleepDuration = 'Sleep duration is required';
    } else if (isNaN(Number(formData.sleepDuration)) || Number(formData.sleepDuration) < 0) {
      newErrors.sleepDuration = 'Please enter a valid duration';
    }
    
    if (!formData.lyingDuration) {
      newErrors.lyingDuration = 'Lying duration is required';
    } else if (isNaN(Number(formData.lyingDuration)) || Number(formData.lyingDuration) < 0) {
      newErrors.lyingDuration = 'Please enter a valid duration';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const { user } = useAppSelector((state: RootState) => state.auth);
  
  // If user has farms, select the first one by default
  useEffect(() => {
    if (user?.farms && user.farms.length > 0) {
      // The farm is an object with _id and name properties
      const farm = user.farms[0].farm;
      if (farm && farm._id) {
        setSelectedFarmId(farm._id);
        console.log('Auto-selected farm:', farm);
      } else {
        console.error('Farm ID is missing in user.farms[0]:', user.farms[0]);
      }
    }
  }, [user]);

  // Function to handle farm selection
  const handleFarmSelection = (farmId: string) => {
    setSelectedFarmId(farmId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Get the selected farm or the first available farm
      let farmId: string = '';
      if (selectedFarmId) {
        farmId = typeof selectedFarmId === 'object' && selectedFarmId !== null && '_id' in selectedFarmId 
          ? (selectedFarmId as { _id: string })._id 
          : selectedFarmId as string;
      } else if (user.farms && user.farms.length > 0) {
        const firstFarm = user.farms[0]?.farm;
        // Extract farm ID whether it's a string or an object with _id
        farmId = (typeof firstFarm === 'object' && firstFarm !== null && '_id' in firstFarm)
          ? firstFarm._id
          : firstFarm || '';
      }
      
      if (!farmId) {
        throw new Error('No farm selected or available');
      }
      
      // Prepare cattle data with the simplified model
      const cattleData = {
        tagId: formData.tagId.toUpperCase(), // Convert to uppercase to match backend
        species: formData.species,
        farm: farmId,
        healthReadings: [{
          temperature: parseFloat(formData.bodyTemperature),
          heartRate: parseFloat(formData.heartRate),
          sleepDuration: parseFloat(formData.sleepDuration),
          lyingDuration: parseFloat(formData.lyingDuration),
          notes: formData.notes || undefined,
          recordedAt: new Date().toISOString()
        }]
      };
      
      await dispatch(addCattle(cattleData)).unwrap();
      
      // Reset form to initial state
      setFormData({
        tagId: '',
        species: 'cow',
        bodyTemperature: '',
        heartRate: '',
        sleepDuration: '',
        lyingDuration: '',
        location: '',
        notes: ''
      });
      
      navigate('/cattle');
    } catch (error: any) {
      console.error('Failed to add cattle:', error);
      setErrors({
        ...errors,
        submit: error.message || 'Failed to add cattle. Please try again.'
      });
    }
  };
  
  // Show a message if user is not authenticated
  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Authentication Required
          </Typography>
          <Typography variant="body1" paragraph>
            Please log in to add cattle to a farm.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/login', { state: { from: '/cattle/add' } })}
          >
            Go to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  // Show a message if user has no farms
  if (!user.farms || user.farms.length === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            No Farm Associated With Your Account
          </Typography>
          <Typography variant="body1" paragraph>
            You need to be associated with a farm before you can add cattle.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400, mx: 'auto' }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate('/farms/create')}
            >
              Create a New Farm
            </Button>
            <Button 
              variant="outlined"
              onClick={() => navigate('/farms/join')}
            >
              Join an Existing Farm
            </Button>
            <Button 
              variant="text"
              startIcon={<ContactSupportIcon />}
              onClick={() => navigate('/contact-support')}
            >
              Contact Support
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {user.farms && user.farms.length > 1 && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Select Farm
            </Typography>
            <Select
              fullWidth
              value={selectedFarmId || user.farms[0]?.farm?._id || ''}
              onChange={(e: SelectChangeEvent) => handleFarmSelection(e.target.value)}
              sx={{ mb: 2 }}
            >
              {user.farms.map((farmRef) => (
                <MenuItem 
                  key={farmRef.farm?._id} 
                  value={farmRef.farm?._id}
                >
                  {farmRef.farm?.name} ({farmRef.role})
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
        
        <Typography variant="h5" gutterBottom>
          Add New Cattle Health Data
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="tagId"
                name="tagId"
                label="Tag ID"
                value={formData.tagId}
                onChange={handleChange}
                error={!!errors.tagId}
                helperText={errors.tagId}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="species"
                name="species"
                label="Species"
                select
                value={formData.species}
                onChange={handleChange}
                error={!!errors.species}
                helperText={errors.species}
              >
                <MenuItem value="cow">Cow</MenuItem>
                <MenuItem value="buffalo">Buffalo</MenuItem>
                <MenuItem value="goat">Goat</MenuItem>
                <MenuItem value="sheep">Sheep</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="location"
                name="location"
                label="Location"
                value={formData.location}
                onChange={handleChange}
                error={!!errors.location}
                helperText={errors.location}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label="Body Temperature (°C)"
                name="bodyTemperature"
                value={formData.bodyTemperature}
                onChange={handleChange}
                error={!!errors.bodyTemperature}
                helperText={errors.bodyTemperature}
                type="number"
                inputProps={{
                  step: '0.1',
                  min: 30,
                  max: 45
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="heartRate"
                name="heartRate"
                label="Heart Rate (bpm)"
                type="number"
                inputProps={{
                  min: '0'
                }}
                value={formData.heartRate}
                onChange={handleChange}
                error={!!errors.heartRate}
                helperText={errors.heartRate}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="sleepDuration"
                name="sleepDuration"
                label="Sleep Duration (hrs)"
                type="number"
                inputProps={{
                  step: '0.1',
                  min: '0'
                }}
                value={formData.sleepDuration}
                onChange={handleChange}
                error={!!errors.sleepDuration}
                helperText={errors.sleepDuration}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="lyingDuration"
                name="lyingDuration"
                label="Lying Duration (hrs)"
                type="number"
                inputProps={{
                  step: '0.1',
                  min: '0'
                }}
                value={formData.lyingDuration}
                onChange={handleChange}
                error={!!errors.lyingDuration}
                helperText={errors.lyingDuration}
              />
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
              >
                Save Cattle
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default AddCattlePage;
