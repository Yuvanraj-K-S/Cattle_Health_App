import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { get, post, patch, del } from '../utils/api';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const CattleContext = createContext();

/**
 * Custom hook to handle API errors consistently
 */
const useApiErrorHandler = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return useCallback(async (promise, options = {}) => {
    const { setError, defaultError = 'An error occurred' } = options;
    
    try {
      const response = await promise;
      if (setError) setError(null);
      return { success: true, data: response };
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle 401 Unauthorized
      if (error.status === 401) {
        logout();
        navigate('/login', { state: { from: window.location.pathname } });
        return { success: false, error: 'Session expired. Please log in again.' };
      }
      
      // Handle 403 Forbidden
      if (error.status === 403) {
        navigate('/unauthorized', { replace: true });
        return { success: false, error: 'You do not have permission to perform this action.' };
      }
      
      // Handle 404 Not Found
      if (error.status === 404) {
        return { 
          success: false, 
          error: error.message || 'The requested resource was not found.',
          notFound: true 
        };
      }
      
      // Set error message
      const errorMessage = error.message || defaultError;
      if (setError) setError(errorMessage);
      
      return { 
        success: false, 
        error: errorMessage,
        status: error.status,
        code: error.code,
        details: error.details 
      };
    }
  }, [navigate, logout]);
};

export const CattleProvider = ({ children }) => {
  const [cattle, setCattle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const { user } = useAuth();
  const handleApiError = useApiErrorHandler();

  /**
   * Fetch all cattle for the current farm
   */
  const fetchCattle = useCallback(async () => {
    if (!user?.farmId) {
      console.log('No farm ID available in fetchCattle');
      setCattle([]);
      setLoading(false);
      setError('No farm ID available');
      return { success: false, error: 'No farm ID available' };
    }

    console.log('Fetching cattle for farm ID:', user.farmId);
    setLoading(true);
    setError(null);
    
    try {
      // Make the API request with the farm_id as a query parameter
      const result = await handleApiError(
        get('/cattle', { farm_id: user.farmId }),
        { setError, defaultError: 'Failed to load cattle data' }
      );
      
      console.log('API Response:', result);
      
      if (result && result.success) {
        // The response structure is: { status: 'success', data: { cattle: [...] } }
        const cattleData = result.data?.data?.cattle || [];
        console.log('Processed cattle data:', cattleData);
        
        // Ensure we're setting an array
        const safeCattleData = Array.isArray(cattleData) ? cattleData : [];
        setCattle(safeCattleData);
        setLoading(false);
        
        return { 
          success: true, 
          data: { cattle: safeCattleData } 
        };
      } else {
        const errorMsg = result?.error || 'Failed to load cattle data';
        console.error('API Error:', errorMsg);
        setCattle([]);
        setError(errorMsg);
        setLoading(false);
        return { 
          success: false, 
          error: errorMsg
        };
      }
    } catch (error) {
      console.error('Error in fetchCattle:', error);
      const errorMsg = error.message || 'An unexpected error occurred';
      setCattle([]);
      setError(errorMsg);
      setLoading(false);
      return { 
        success: false, 
        error: errorMsg
      };
    }
  }, [user?.farmId, handleApiError]);

  /**
   * Fetch cattle statistics for the current farm
   */
  const fetchStats = useCallback(async () => {
    if (!user?.farmId) {
      console.log('No farm ID available in fetchStats');
      setStats(null);
      return { success: false, error: 'No farm ID available' };
    }

    console.log('Fetching stats for farm ID:', user.farmId);
    
    try {
      const result = await handleApiError(
        get('/cattle/stats', { farm_id: user.farmId }),
        { defaultError: 'Failed to load statistics' }
      );
      
      console.log('Stats API Response:', result);
      
      if (result.success) {
        // The response structure is: { status: 'success', data: { stats: { ... } } }
        const statsData = result.data?.data?.stats || null;
        console.log('Processed stats data:', statsData);
        setStats(statsData);
        return { 
          success: true, 
          data: { stats: statsData } 
        };
      } else {
        console.error('Stats API Error:', result.error);
        setStats(null);
        return { 
          success: false, 
          error: result.error || 'Failed to load statistics' 
        };
      }
    } catch (error) {
      console.error('Error in fetchStats:', error);
      setStats(null);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred while fetching stats' 
      };
    }
  }, [user?.farmId, handleApiError]);

  /**
   * Add new cattle to the current farm
   */
  const addCattle = async (cattleData) => {
    if (!user?.farmId) {
      return { success: false, error: 'No farm ID available' };
    }

    // Ensure farm_id matches the current user's farm
    const cattleWithFarm = {
      ...cattleData,
      farm_id: user.farmId
    };

    const result = await handleApiError(
      post('/cattle', cattleWithFarm),
      { defaultError: 'Failed to add cattle' }
    );
    
    if (result.success) {
      await fetchCattle(); // Refresh the list
    }
    
    return result;
  };

  /**
   * Update existing cattle
   */
  const updateCattle = async (id, updates) => {
    if (!user?.farmId) {
      return { success: false, error: 'No farm ID available' };
    }

    // Prevent changing farm_id
    const { farm_id, ...safeUpdates } = updates;
    
    const result = await handleApiError(
      patch(`/cattle/${id}`, safeUpdates),
      { defaultError: 'Failed to update cattle' }
    );
    
    if (result.success) {
      await fetchCattle(); // Refresh the list
    }
    
    return result;
  };

  /**
   * Delete cattle
   */
  const deleteCattle = async (id) => {
    if (!user?.farmId) {
      return { success: false, error: 'No farm ID available' };
    }

    const result = await handleApiError(
      del(`/cattle/${id}`),
      { defaultError: 'Failed to delete cattle' }
    );
    
    if (result.success) {
      await fetchCattle(); // Refresh the list
    }
    
    return result;
  };

  /**
   * Add health reading to a cattle
   */
  const addHealthReading = async (cattleId, readingData) => {
    if (!user?.farmId) {
      return { success: false, error: 'No farm ID available' };
    }

    // Find the cattle to get its tag_id
    const targetCattle = cattle.find(c => c._id === cattleId);
    if (!targetCattle) {
      return { success: false, error: 'Cattle not found' };
    }

    // Ensure the reading includes the cattle's tag_id
    const readingWithTagId = {
      ...readingData,
      tag_id: targetCattle.tag_id // Add the cattle's tag_id to the reading
    };

    const result = await handleApiError(
      post(`/cattle/${cattleId}/readings`, readingWithTagId),
      { defaultError: 'Failed to add health reading' }
    );
    
    if (result.success) {
      await fetchCattle(); // Refresh the list
    }
    
    return result;
  };

  /**
   * Get health readings for a cattle
   */
  const getHealthReadings = async (cattleId, limit = 0) => {
    if (!user?.farmId) {
      return { success: false, error: 'No farm ID available', data: [] };
    }

    const result = await handleApiError(
      get(`/cattle/${cattleId}/readings`, { limit }),
      { defaultError: 'Failed to fetch health readings' }
    );
    
    return {
      ...result,
      data: result.success ? (result.data?.data || []) : []
    };
  };

  // Initial data fetch when component mounts or user changes
  useEffect(() => {
    if (user?.farmId) {
      fetchCattle();
      fetchStats();
    } else {
      setCattle([]);
      setStats(null);
      setLoading(false);
    }
  }, [user, fetchCattle, fetchStats]);

  // Context value
  const value = {
    cattle,
    stats,
    loading,
    error,
    farmId: user?.farmId,
    addCattle,
    updateCattle,
    deleteCattle,
    addHealthReading,
    getHealthReadings,
    refreshCattle: fetchCattle,
    refreshStats: fetchStats,
  };

  return (
    <CattleContext.Provider value={value}>
      {children}
    </CattleContext.Provider>
  );
};

/**
 * Hook to use the cattle context
 */
export const useCattle = () => {
  const context = useContext(CattleContext);
  if (!context) {
    throw new Error('useCattle must be used within a CattleProvider');
  }
  return context;
};

export default CattleContext;
