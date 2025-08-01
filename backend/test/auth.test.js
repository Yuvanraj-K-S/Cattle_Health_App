const request = require('supertest');
const { setupTestEnvironment, tearDownTestEnvironment } = require('./setupTestEnvironment');
const { testUsers } = require('./testHelpers');
const app = require('../server');

// Test server instance will be set by setupTestEnvironment
let testServerInstance;

describe('Authentication API Tests', () => {
  beforeAll(async () => {
    try {
      // Set up test environment with in-memory MongoDB
      const { server } = await setupTestEnvironment();
      testServerInstance = server;
      
      // The server is already started by setupTestEnvironment
      // and seed data is already imported
    } catch (error) {
      console.error('Test setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await tearDownTestEnvironment();
    } catch (error) {
      console.error('Test teardown failed:', error);
      throw error;
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const newUser = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        password: 'Test@1234',
        phone: '+1234567890',
        role: 'worker'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user).toHaveProperty('email', newUser.email);
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should not register with an existing email', async () => {
      const existingUser = {
        firstName: 'Test',
        lastName: 'Existing',
        email: testUsers.farmOwner.email,
        password: 'Test@1234',
        phone: '+1234567890',
        role: 'worker'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(existingUser);
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.farmOwner.email,
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user).toHaveProperty('email', testUsers.farmOwner.email);
    });

    it('should not login with invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.farmOwner.email,
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get a token
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUsers.farmOwner.email,
          password: 'password123'
        });
      
      authToken = res.body.token;
    });

    it('should get current user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', testUsers.farmOwner.email);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should not get profile without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Not authorized');
    });

    it('should not get profile with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Not authorized');
    });
  });
});
