import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';
import { RootState } from '../../store/store';

interface Location {
  _id: string;
  name: string;
  // Add other location fields as needed
}

interface HealthReading {
  _id?: string;
  temperature: number | null;
  heartRate: number | null;
  sleepDuration: number | null;
  lyingDuration: number | null;
  location?: string;
  recordedAt: string;
  updatedAt?: string;
  recordedBy?: string;
  notes?: string;
}

interface CattleData {
  _id?: string;
  tagId: string;
  species: string;
  farm: string | { _id: string; name: string };
  healthReadings: HealthReading[];
  status?: string;
  addedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  // For backward compatibility
  lastReading?: HealthReading;
}

interface PaginationInfo {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

interface CattleResponse {
  success: boolean;
  data: CattleData | CattleData[];
  count?: number;
  pagination?: PaginationInfo;
  message?: string;
}

interface CattleState {
  cattle: CattleData[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  count: number;
  addStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: CattleState = {
  cattle: [],
  status: 'idle',
  error: null,
  count: 0,
  addStatus: 'idle',
};

interface FetchCattleParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const fetchCattle = createAsyncThunk<CattleResponse, FetchCattleParams & { farmId?: string } | undefined, { state: RootState }>(
  'cattle/fetchCattle',
  async (params = {}, { getState }) => {
    const { auth } = getState();
    const { farmId: paramFarmId, ...queryParams } = params;
    
    // Use provided farmId or get from user's first farm
    const farmId = paramFarmId || auth.user?.farms?.[0]?.farm?._id;
    
    if (!farmId) {
      throw new Error('No farm specified and no default farm available for the user');
    }

    // Convert query parameters to URLSearchParams
    const queryString = new URLSearchParams();
    
    // Add all non-undefined query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryString.append(key, value.toString());
      }
    });

    // Make the API request with the farm ID in the path
    const response = await apiClient.get(`/api/v1/farms/${farmId}/cattle?${queryString.toString()}`);
    
    // Log the raw response for debugging
    console.group('Raw API Response');
    console.log('Response status:', response.status);
    console.log('Full response data:', JSON.parse(JSON.stringify(response.data)));
    
    // Log the structure of the first cattle item if available
    if (response.data.data) {
      const firstCattle = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
      if (firstCattle) {
        console.log('First cattle item structure:', {
          keys: Object.keys(firstCattle),
          hasTemperature: 'temperature' in firstCattle,
          hasHeartRate: 'heartRate' in firstCattle,
          hasSleepDuration: 'sleepDuration' in firstCattle,
          hasLyingDuration: 'lyingDuration' in firstCattle,
          hasLatestReading: 'latestReading' in firstCattle,
          latestReadingKeys: firstCattle.latestReading ? Object.keys(firstCattle.latestReading) : 'No latestReading'
        });
      }
    }
    console.groupEnd();
    
    if (!response.data.success) {
      console.error('API returned unsuccessful response:', response.data.message);
      throw new Error(response.data.message || 'Failed to fetch cattle');
    }
    
    // Ensure we have data to work with
    if (!response.data.data) {
      console.error('No data field in response:', response.data);
      throw new Error('Invalid response format: missing data field');
    }
    
    // Transform the data to match our frontend structure
    const cattleData = Array.isArray(response.data.data) 
      ? response.data.data 
      : [response.data.data];
      
    console.log('Raw cattle data:', cattleData);
    
    const transformedCattle = cattleData.map((cow: any) => {
      console.log('Processing cow:', cow);
      return {
        ...cow,
        // If location is an object with name, use that, otherwise use the string
        location: cow.location?.name || cow.location || 'Unknown Location',
        // Ensure all numeric fields are numbers
        temperature: cow.temperature !== undefined ? Number(cow.temperature) : undefined,
        heartRate: cow.heartRate !== undefined ? Number(cow.heartRate) : undefined,
        sleepDuration: cow.sleepDuration !== undefined ? Number(cow.sleepDuration) : undefined,
        lyingDuration: cow.lyingDuration !== undefined ? Number(cow.lyingDuration) : undefined,
      };
    });
    
    const transformedData = {
      ...response.data,
      data: transformedCattle
    };
    
    console.group('Transformed Data');
    console.log('Transformed cattle data:', transformedData);
    console.log('First cattle item:', transformedCattle[0]);
    console.groupEnd();
    
    return transformedData;
  }
);

export const addCattle = createAsyncThunk<CattleResponse, Omit<CattleData, '_id' | 'farm' | 'addedBy' | 'status' | 'createdAt' | 'updatedAt'> & { farm: string }, { state: RootState }>(
  'cattle/addCattle',
  async (cattleData, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      if (!auth.user) {
        return rejectWithValue('User not authenticated');
      }
      
      if (!auth.user.farms || auth.user.farms.length === 0) {
        return rejectWithValue('No farm associated with your account');
      }
      
      // Get the farm ID from the cattleData (passed from the component)
      const farmId = cattleData.farm;
      
      if (!farmId) {
        return rejectWithValue('No farm specified for adding cattle');
      }
      
      // Prepare the request data
      const requestData = {
        tagId: cattleData.tagId,
        species: cattleData.species,
        farm: farmId,
        ...(cattleData.healthReadings?.[0] && {
          temperature: cattleData.healthReadings[0].temperature,
          heartRate: cattleData.healthReadings[0].heartRate,
          sleepDuration: cattleData.healthReadings[0].sleepDuration,
          lyingDuration: cattleData.healthReadings[0].lyingDuration,
          recordedAt: cattleData.healthReadings[0].recordedAt || new Date().toISOString(),
          notes: cattleData.healthReadings[0].notes
        })
      };
      
      // Add cattle with the initial health reading using the farm-specific endpoint
      const response = await apiClient.post(`/api/v1/farms/${farmId}/cattle`, requestData);
      
      // Format the response to match our frontend structure
      const formattedResponse = {
        ...response.data,
        data: {
          ...response.data.data,
          farm: {
            _id: farmId,
            name: auth.user.farms.find((f: any) => f.farm._id === farmId)?.farm.name || 'Unknown Farm'
          },
          lastReading: response.data.data.healthReadings?.[0] || null
        }
      };
      
      return formattedResponse;
    } catch (error: any) {
      console.error('Error in addCattle thunk:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
      });
      
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to add cattle';
      return rejectWithValue(errorMessage);
    }
  }
);

const cattleSlice = createSlice({
  name: 'cattle',
  initialState,
  reducers: {
    resetAddStatus: (state) => {
      state.addStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    // Fetch Cattle
    builder
      .addCase(fetchCattle.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCattle.fulfilled, (state, action: PayloadAction<CattleResponse>) => {
        console.group('Processing fetchCattle.fulfilled');
        console.log('Action payload:', action.payload);
        
        state.status = 'succeeded';
        
        try {
          // Process and normalize the cattle data
          const processCattleData = (data: any) => {
            console.log('Processing data in processCattleData:', JSON.stringify(data, null, 2));
            
            if (!data) {
              console.log('No data provided to processCattleData');
              return [];
            }
            
            // Handle both array and single object responses
            const cattleArray = Array.isArray(data) ? data : [data];
            console.log(`Processing ${cattleArray.length} cattle items`);
            
            return cattleArray.map((cow: any, index: number) => {
              console.log(`Processing cattle ${index + 1}:`, JSON.stringify(cow, null, 2));
              
              // Get the latest health reading if available
              const healthReadings = Array.isArray(cow.health_readings) 
                ? cow.health_readings 
                : [];
                
              const latestHealthReading = healthReadings.length > 0 
                ? healthReadings[healthReadings.length - 1] 
                : null;
              
              console.log(`Latest health reading for ${cow.tagId || 'unknown'}:`, latestHealthReading);
              
              // Extract health metrics from the latest reading or use undefined
              const healthMetrics = latestHealthReading ? {
                temperature: latestHealthReading.bodyTemperature?.value,
                heartRate: latestHealthReading.heartRate?.value,
                sleepDuration: latestHealthReading.sleepDuration?.value,
                lyingDuration: latestHealthReading.lyingDuration?.value,
                lastUpdated: latestHealthReading.recordedAt || cow.updatedAt
              } : {
                temperature: undefined,
                heartRate: undefined,
                sleepDuration: undefined,
                lyingDuration: undefined,
                lastUpdated: cow.updatedAt
              };
              
              const processedCow = {
                _id: cow._id,
                tagId: cow.tagId,
                location: cow.currentLocation || cow.location || 'Unknown',
                status: cow.status || 'active',
                // Spread health metrics
                ...healthMetrics,
                // Include other fields
                ...(cow.species && { species: cow.species }),
                ...(cow.breed && { breed: cow.breed }),
                // Include the raw health_readings array if needed
                health_readings: healthReadings
              };
              
              console.log(`Processed cattle ${index + 1}:`, processedCow);
              return processedCow;
            });
          };
          
          // Log the raw payload for debugging
          console.log('Raw payload:', JSON.stringify(action.payload, null, 2));
          
          // Extract the data array from the response
          const responseData = action.payload.data;
          console.log('Response data type:', Array.isArray(responseData) ? 'array' : typeof responseData);
          
          // Process the cattle data
          const processedCattle = processCattleData(responseData);
          console.log(`Processed ${processedCattle.length} cattle items`);
          
          // Update the state with the processed data
          state.cattle = processedCattle;
          
          // Update the count from pagination if available, otherwise use the length of the data
          state.count = action.payload.pagination?.total || processedCattle.length;
          
          console.log(`Updated state with ${processedCattle.length} cattle, total count: ${state.count}`);
          
          // Log first few cattle items for debugging
          console.log('First few cattle items:', state.cattle.slice(0, 3));
          if (state.cattle.length > 0) {
            console.log('First cattle item details:', JSON.stringify(state.cattle[0], null, 2));
          }
          
          console.log('Current cattle state:', {
            count: state.count,
            cattleCount: state.cattle.length,
            status: state.status,
            error: state.error
          });
        } catch (error) {
          console.error('Error processing cattle data:', error);
          state.status = 'failed';
          state.error = error instanceof Error ? error.message : 'Failed to process cattle data';
        }
        
        console.groupEnd();
      })
      .addCase(fetchCattle.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch cattle';
        console.error('Failed to fetch cattle:', action.error);
      });

    // Add Cattle
    builder
      .addCase(addCattle.pending, (state) => {
        state.addStatus = 'loading';
      })
      .addCase(addCattle.fulfilled, (state, action: PayloadAction<CattleResponse>) => {
        state.addStatus = 'succeeded';
        const responseData = action.payload.data;
        
        // Process the new cattle data to match our frontend structure
        const processCattleData = (cow: any) => {
          const latestHealthReading = Array.isArray(cow.health_readings) && cow.health_readings.length > 0 
            ? cow.health_readings[cow.health_readings.length - 1] 
            : null;
          
          return {
            _id: cow._id,
            tagId: cow.tagId,
            location: cow.currentLocation || cow.location,
            status: cow.status,
            temperature: latestHealthReading?.bodyTemperature?.value,
            heartRate: latestHealthReading?.heartRate?.value,
            sleepDuration: latestHealthReading?.sleepDuration?.value,
            lyingDuration: latestHealthReading?.lyingDuration?.value,
            lastUpdated: latestHealthReading?.recordedAt || cow.updatedAt,
            ...(cow.species && { species: cow.species }),
            ...(cow.breed && { breed: cow.breed }),
            health_readings: cow.health_readings || []
          };
        };
        
        const newCattle = Array.isArray(responseData) 
          ? responseData.map(processCattleData)[0]
          : processCattleData(responseData);
        
        state.cattle.unshift(newCattle); // Add to the beginning of the array
        state.count += 1;
      })
      .addCase(addCattle.rejected, (state, action) => {
        state.addStatus = 'failed';
        state.error = action.error.message || 'Failed to add cattle';
      });
  },
});

export const { resetAddStatus } = cattleSlice.actions;

export const selectAllCattle = (state: RootState) => state.cattle.cattle;
export const getCattleStatus = (state: RootState) => state.cattle.status;
export const getCattleError = (state: RootState) => state.cattle.error;
export const getCattleCount = (state: RootState) => state.cattle.count;

export default cattleSlice.reducer;
