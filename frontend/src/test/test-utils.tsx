import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RootState } from '../store/store';
import authReducer from '../features/auth/authSlice';

// Create a custom render function that includes providers
type CustomRenderOptions = {
  preloadedState?: Partial<RootState>;
  route?: string;
  initialEntries?: string[];
} & Omit<RenderOptions, 'queries'>;

const customRender = (
  ui: ReactElement,
  {
    preloadedState = {},
    route = '/',
    initialEntries = ['/'],
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState,
  });

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

  return render(ui, { wrapper: Wrapper, ...renderOptions });
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
    preloadedState,
  });
};

export const mockAuthState = {
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
} as const;
