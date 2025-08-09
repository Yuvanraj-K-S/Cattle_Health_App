import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RootState, AppDispatch } from '../store/store';
import authReducer from '../features/auth/authSlice';

// Define the User interface
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Define the auth state type
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Create a custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: {
    auth?: Partial<AuthState>;
  };
  route?: string;
  initialEntries?: string[];
}

interface CustomRenderResult extends RenderResult {
  store: ReturnType<typeof configureStore> & { dispatch: AppDispatch };
}

const customRender = (
  ui: ReactElement,
  {
    preloadedState = {},
    route = '/',
    initialEntries = ['/'],
    ...renderOptions
  }: CustomRenderOptions = {}
): CustomRenderResult => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: preloadedState as any, // Type assertion to handle partial state
  }) as AppStore;

  const theme = createTheme({});

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path={route} element={children} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  return {
    ...result,
    store,
  };
};

// Re-export everything
export * from '@testing-library/react';
// Override render method
export { customRender as render };

// Helper functions
export const createMockStore = (preloadedState: Partial<RootState> = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: preloadedState as any, // Type assertion to handle partial state
  }) as ReturnType<typeof configureStore> & { dispatch: AppDispatch };
};

// Define the AppStore type for testing
type AppStore = EnhancedStore<{ auth: AuthState }>;

// Mock auth state for testing
export const mockAuthState = {
  auth: {
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
    },
    token: 'mock-jwt-token',
    isAuthenticated: true,
    loading: false,
    error: null,
  }
} as const;
