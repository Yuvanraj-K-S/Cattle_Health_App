import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { User } from './authSlice';
import { useEffect } from 'react';
import { initializeAuth } from './authSlice';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasRole: (role: string) => boolean;
  hasFarmAccess: (farmId: string, requiredRole?: string) => boolean;
  getDefaultFarmId: () => string | undefined;
}

export const useAuth = (): UseAuthReturn => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading, error } = useSelector(
    (state: RootState) => state.auth
  );

  // Initialize auth state on mount
  useEffect(() => {
    (async () => {
      try {
        await dispatch(initializeAuth() as any).unwrap();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      }
    })();
  }, [dispatch]);

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  // Check if user has access to a specific farm with optional role requirement
  const hasFarmAccess = (farmId: string, requiredRole?: string): boolean => {
    if (!user?.farms) return false;
    
    const farmAccess = user.farms.find(farm => farm.farm._id === farmId);
    if (!farmAccess) return false;
    
    if (requiredRole) {
      return farmAccess.role === requiredRole;
    }
    
    return true;
  };

  // Get the user's default farm ID
  const getDefaultFarmId = (): string | undefined => {
    if (!user) return undefined;
    
    // Return explicitly set default farm if available
    if (user.defaultFarm) return user.defaultFarm;
    
    // Otherwise return the first farm the user has access to
    if (user.farms && user.farms.length > 0) {
      return user.farms[0].farm._id;
    }
    
    return undefined;
  };

  return {
    user,
    isAuthenticated,
    isLoading: loading,
    error,
    hasRole,
    hasFarmAccess,
    getDefaultFarmId,
  };
};

export default useAuth;
