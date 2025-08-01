const request = require('supertest');
const { connectDB, clearDatabase, closeDatabase } = require('./testUtils');
const app = require('../server');
const User = require('../models/User');

// Test user credentials
const testUser = {
  email: 'john.doe@greenvalley.com',
  password: 'password123' // This should match the hashed password in your seed data
};

describe('API Tests', () => {
  let authToken;
  let server;
  let testServer;

  // Start server before tests
  beforeAll(async () => {
    try {
      // Connect to the test database
      await connectDB();
      
      // Clear any existing data
      await clearDatabase();
      
      // Import seed data for testing
      await require('../seeds/index').importData();
      
      // Start the server
      return new Promise((resolve) => {
        testServer = app.listen(0, () => {
          console.log(`Test server running on port ${testServer.address().port}`);
          resolve();
        });
      });
    } catch (error) {
      console.error('Test setup failed:', error);
      throw error;
    }
  });

  // Close server and database connection after tests
  afterAll(async () => {
    try {
      if (testServer) {
        await new Promise(resolve => testServer.close(resolve));
      }
      await closeDatabase();
    } catch (error) {
      console.error('Error during test teardown:', error);
      throw error;
    }
  });

  // Test authentication
  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const res = await request(testServer)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'password123'
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      
      // Save token for subsequent requests
      authToken = res.body.token;
    });
  });

  // Test cattle endpoints
  describe('Cattle Management', () => {
    let cattleId;

    it('should get all cattle for a farm', async () => {
      // First, ensure we have a valid auth token
      if (!authToken) {
        const loginRes = await request(testServer)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: 'password123'
          });
        authToken = loginRes.body.token;
      }
      
      const res = await request(testServer)
        .get('/api/v1/farms/64c1f5a5e4a8f6b8d4f3e2a1/cattle')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Save first cattle ID for subsequent tests
      let cattleId = null;
      if (res.body.data.length > 0) {
        cattleId = res.body.data[0]._id;
      }
      expect(cattleId).toBeDefined();
      return cattleId;
    });

    it('should get a single cattle by ID', async () => {
      // First get a cattle ID
      const cattleRes = await request(testServer)
        .get('/api/v1/farms/64c1f5a5e4a8f6b8d4f3e2a1/cattle')
        .set('Authorization', `Bearer ${authToken}`);
      
      const cattleId = cattleRes.body.data[0]._id;
      expect(cattleId).toBeDefined();
      
      // Then test getting the cattle by ID
      const res = await request(testServer)
        .get(`/api/v1/cattle/${cattleId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id', cattleId);
    });
  });

  // Test health readings
  describe('Health Readings', () => {
    it('should get health readings for a cattle', async () => {
      // First get a cattle ID
      const cattleRes = await request(testServer)
        .get('/api/v1/farms/64c1f5a5e4a8f6b8d4f3e2a1/cattle')
        .set('Authorization', `Bearer ${authToken}`);
      
      const cattleId = cattleRes.body.data[0]._id;
      expect(cattleId).toBeDefined();
      
      // Test getting health readings
      const res = await request(testServer)
        .get(`/api/v1/cattle/${cattleId}/health`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get health stats for a cattle', async () => {
      // First get a cattle ID
      const cattleRes = await request(testServer)
        .get('/api/v1/farms/64c1f5a5e4a8f6b8d4f3e2a1/cattle')
        .set('Authorization', `Bearer ${authToken}`);
      
      const cattleId = cattleRes.body.data[0]._id;
      expect(cattleId).toBeDefined();
      
      // Test getting health stats
      const res = await request(testServer)
        .get(`/api/v1/cattle/${cattleId}/health/stats`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('averageTemperature');
      expect(res.body.data).toHaveProperty('averageHeartRate');
    });
  });
});
