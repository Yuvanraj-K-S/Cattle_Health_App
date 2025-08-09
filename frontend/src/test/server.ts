import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

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
  http.post('/api/v1/auth/login', async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string };
    
    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json({
        user: mockUser,
        token: 'mock-jwt-token',
      }, { status: 200 });
    }
    
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Get current user
  http.get('/api/v1/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader === 'Bearer mock-jwt-token') {
      return HttpResponse.json(
        { user: mockUser },
        { status: 200 }
      );
    }
    
    return HttpResponse.json(
      { message: 'Not authenticated' },
      { status: 401 }
    );
  }),

  // Logout
  http.post('/api/v1/auth/logout', () => {
    return HttpResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  }),
];

// Create the mock server
export const server = setupServer(...handlers);
