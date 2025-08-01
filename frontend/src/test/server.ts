import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock data
const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
};

// Mock handlers
const handlers = [
  // Login
  rest.post('/api/v1/auth/login', (req, res, ctx) => {
    const { email, password } = req.body as { email: string; password: string };
    
    if (email === 'test@example.com' && password === 'password') {
      return res(
        ctx.status(200),
        ctx.json({
          user: mockUser,
          token: 'mock-jwt-token',
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ message: 'Invalid credentials' })
    );
  }),

  // Get current user
  rest.get('/api/v1/auth/me', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader === 'Bearer mock-jwt-token') {
      return res(
        ctx.status(200),
        ctx.json({ user: mockUser })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ message: 'Not authenticated' })
    );
  }),

  // Logout
  rest.post('/api/v1/auth/logout', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Logged out successfully' })
    );
  }),
];

// Create the mock server
export const server = setupServer(...handlers);
