const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

// Test data
let testTenant;
let testUser;
let testUserToken;
let testAdmin;
let testAdminToken;
let superAdmin;
let superAdminToken;

// Helper function to get auth header
const getAuthHeader = (token) => {
  return { 'Authorization': `Bearer ${token}` };
};

// Setup test database before tests
beforeAll(async () => {
  // Connect to a test database
  await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/cattle_health_test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
  });

  // Create a test tenant
  testTenant = await Tenant.create({
    name: 'Test Farm',
    slug: 'test-farm',
    contactEmail: 'test@test.com',
    subscriptionPlan: 'premium',
    subscriptionStatus: 'active',
    subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  });

  // Create a test user
  testUser = await User.create({
    username: 'testuser',
    email: 'testuser@test.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    tenantId: testTenant._id,
    isVerified: true
  });

  // Create a test admin user
  testAdmin = await User.create({
    username: 'testadmin',
    email: 'admin@test.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    tenantId: testTenant._id,
    isTenantAdmin: true,
    isVerified: true
  });

  // Create a super admin user
  superAdmin = await User.create({
    username: 'superadmin',
    email: 'superadmin@test.com',
    password: 'superadmin123',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'superadmin',
    isVerified: true
  });

  // Get auth tokens
  const userRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'testuser@test.com',
      password: 'password123'
    });
  testUserToken = userRes.body.token;

  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@test.com',
      password: 'admin123'
    });
  testAdminToken = adminRes.body.token;

  const superAdminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'superadmin@test.com',
      password: 'superadmin123'
    });
  superAdminToken = superAdminRes.body.token;
});

// Clean up test database after tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Multi-tenancy', () => {
  describe('Tenant Isolation', () => {
    test('should not allow users to access other tenants\' data', async () => {
      // Create a second tenant
      const anotherTenant = await Tenant.create({
        name: 'Another Farm',
        slug: 'another-farm',
        contactEmail: 'another@test.com',
        subscriptionPlan: 'premium',
        subscriptionStatus: 'active'
      });

      // Create a user in the second tenant
      const anotherUser = await User.create({
        username: 'anotheruser',
        email: 'another@test.com',
        password: 'password123',
        tenantId: anotherTenant._id,
        isVerified: true
      });

      // Try to access the second tenant's data as the first user
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .set('x-tenant-id', anotherTenant._id);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Super Admin Access', () => {
    test('should allow superadmin to access any tenant\'s data', async () => {
      const res = await request(app)
        .get(`/api/v1/tenants/${testTenant._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(testTenant._id.toString());
    });
  });

  describe('Tenant Admin', () => {
    test('should allow tenant admin to manage their tenant', async () => {
      const res = await request(app)
        .put(`/api/v1/tenants/${testTenant._id}`)
        .set('Authorization', `Bearer ${testAdminToken}`)
        .send({
          name: 'Updated Farm Name'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Farm Name');
    });

    test('should not allow tenant admin to manage other tenants', async () => {
      // Create another tenant
      const anotherTenant = await Tenant.create({
        name: 'Another Farm',
        slug: 'another-farm-2',
        contactEmail: 'another2@test.com',
        subscriptionPlan: 'premium',
        subscriptionStatus: 'active'
      });

      const res = await request(app)
        .put(`/api/v1/tenants/${anotherTenant._id}`)
        .set('Authorization', `Bearer ${testAdminToken}`)
        .send({
          name: 'Should Not Update'
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Regular User', () => {
    test('should not allow regular users to manage tenant settings', async () => {
      const res = await request(app)
        .put(`/api/v1/tenants/${testTenant._id}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: 'Unauthorized Update'
        });

      expect(res.statusCode).toBe(403);
    });

    test('should allow users to access their own tenant data', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.tenantId).toBe(testTenant._id.toString());
    });
  });
});

describe('API Context', () => {
  test('should require tenant context for API requests', async () => {
    const res = await request(app)
      .get('/api/v1/cattle')
      .set('Authorization', `Bearer ${testUserToken}`);

    // This should fail because we didn't set x-tenant-id header
    // and the user doesn't have tenantId set (which they should in a real scenario)
    expect(res.statusCode).toBe(400);
  });

  test('should allow superadmin to set tenant context via header', async () => {
    const res = await request(app)
      .get(`/api/v1/tenants/${testTenant._id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .set('x-tenant-id', testTenant._id);

    expect(res.statusCode).toBe(200);
    expect(res.body.data._id).toBe(testTenant._id.toString());
  });
});
