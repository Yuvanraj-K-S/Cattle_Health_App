const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const User = require('../models/User');

/**
 * Create a test tenant with default values
 * @param {Object} [overrides] - Override default tenant properties
 * @returns {Promise<Object>} Created tenant document
 */
const createTestTenant = async (overrides = {}) => {
  const defaultTenant = {
    name: 'Test Tenant ' + Math.random().toString(36).substring(7),
    slug: 'test-tenant-' + Math.random().toString(36).substring(7),
    contactEmail: `test-${Date.now()}@example.com`,
    subscriptionPlan: 'premium',
    subscriptionStatus: 'active',
    subscriptionStartDate: new Date(),
    subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    settings: {
      maxUsers: 10,
      maxCattle: 1000,
      features: {
        advancedAnalytics: true,
        customReports: true,
        apiAccess: true
      }
    },
    isActive: true,
    ...overrides
  };

  return await Tenant.create(defaultTenant);
};

/**
 * Create a test user with a specific role in a tenant
 * @param {Object} tenant - The tenant document
 * @param {string} role - User role (user, admin, etc.)
 * @param {Object} [overrides] - Override default user properties
 * @returns {Promise<Object>} Created user document with auth token
 */
const createTestUser = async (tenant, role = 'user', overrides = {}) => {
  const username = `testuser_${role}_${Date.now()}`;
  const email = `${username}@example.com`;
  const password = 'password123';
  
  const userData = {
    username,
    email,
    password,
    firstName: 'Test',
    lastName: role.charAt(0).toUpperCase() + role.slice(1),
    role,
    tenantId: tenant._id,
    isTenantAdmin: role === 'admin',
    isVerified: true,
    ...overrides
  };

  const user = await User.create(userData);
  
  // Get auth token
  const token = user.getSignedJwtToken();
  
  return {
    ...user.toObject(),
    token,
    password // Include for testing auth
  };
};

/**
 * Create a super admin user (no tenant association)
 * @param {Object} [overrides] - Override default user properties
 * @returns {Promise<Object>} Created super admin user with auth token
 */
const createSuperAdmin = async (overrides = {}) => {
  const username = `superadmin_${Date.now()}`;
  const email = `${username}@example.com`;
  const password = 'superadmin123';
  
  const userData = {
    username,
    email,
    password,
    firstName: 'Super',
    lastName: 'Admin',
    role: 'superadmin',
    isVerified: true,
    ...overrides
  };

  const user = await User.create(userData);
  const token = user.getSignedJwtToken();
  
  return {
    ...user.toObject(),
    token,
    password
  };
};

/**
 * Clean up test data
 * @param {string[]} [collections] - Specific collections to clean (default: all)
 */
const cleanupTestData = async (collections) => {
  const db = mongoose.connection.db;
  
  if (!collections) {
    collections = (await db.listCollections().toArray())
      .map(c => c.name)
      .filter(name => !name.startsWith('system.'));
  }
  
  await Promise.all(
    collections.map(collection => 
      db.collection(collection).deleteMany({})
    )
  );
};

/**
 * Setup test environment with a tenant and admin user
 * @returns {Promise<Object>} Test environment with tenant, admin, and tokens
 */
const setupTestEnvironment = async () => {
  // Clean up any existing test data
  await cleanupTestData();
  
  // Create a test tenant
  const tenant = await createTestTenant();
  
  // Create a tenant admin
  const admin = await createTestUser(tenant, 'admin');
  
  // Create a regular user
  const user = await createTestUser(tenant, 'user');
  
  // Create a super admin
  const superAdmin = await createSuperAdmin();
  
  return {
    tenant,
    users: {
      admin,
      user,
      superAdmin
    }
  };
};

module.exports = {
  createTestTenant,
  createTestUser,
  createSuperAdmin,
  cleanupTestData,
  setupTestEnvironment
};
