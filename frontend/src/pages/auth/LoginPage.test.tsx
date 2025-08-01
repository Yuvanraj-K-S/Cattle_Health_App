import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../test/server';
import { render } from '../../test/test-utils';
import LoginPage from './LoginPage';
import { mockAuthState } from '../../test/test-utils';

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('validates form inputs', async () => {
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Submit empty form
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(await screen.findByText(/password must be at least 6 characters/i)).toBeInTheDocument();
  });

  it('handles login success', async () => {
    const { store } = render(<LoginPage />, { route: '/login' });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    // Check loading state
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();

    // Wait for login to complete and check if user is redirected
    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(window.location.pathname).toBe('/dashboard');
    });
  });

  it('handles login failure', async () => {
    // Override the default handler for this test
    server.use(
      rest.post('/api/v1/auth/login', (req, res, ctx) => {
        return res(
          ctx.status(401),
          ctx.json({ message: 'Invalid credentials' })
        );
      })
    );

    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    // Check error message
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('redirects to dashboard if already authenticated', () => {
    render(<LoginPage />, {
      preloadedState: {
        auth: {
          ...mockAuthState,
          isAuthenticated: true,
        },
      },
      route: '/login',
    });

    // Should redirect to dashboard
    expect(window.location.pathname).toBe('/dashboard');
  });
});
