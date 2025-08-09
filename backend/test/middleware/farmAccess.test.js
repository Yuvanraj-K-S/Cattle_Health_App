const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createRequest, createResponse } = require('node-mocks-http');
const jwt = require('jsonwebtoken');
const { checkFarmAccess, isFarmOwner, isFarmAdmin, hasFarmRole } = require('../../middleware/farmAccess');
const Farm = require('../../models/Farm');
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');

// Mock logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Farm Access Middleware', () => {
  let mongoServer;
  let user1, user2, farm1, farm2;
  
  // Setup in-memory MongoDB before tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });
  
  // Clean up after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  // Create test data before each test
  beforeEach(async () => {
    // Clear all test data
    await User.deleteMany({});
    await Farm.deleteMany({});
    
    // Create test users
    user1 = await User.create({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User1'
    });
    
    user2 = await User.create({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User2'
    });
    
    // Create test farms
    farm1 = await Farm.create({
      name: 'Test Farm 1',
      owner: user1._id,
      users: [
        { user: user1._id, role: 'owner', addedBy: user1._id, isActive: true },
        { user: user2._id, role: 'manager', addedBy: user1._id, isActive: true }
      ]
    });
    
    farm2 = await Farm.create({
      name: 'Test Farm 2',
      owner: user2._id,
      users: [
        { user: user2._id, role: 'owner', addedBy: user2._id, isActive: true },
        { user: user1._id, role: 'viewer', addedBy: user2._id, isActive: true }
      ]
    });
  });
  
  describe('checkFarmAccess', () => {
    it('should allow access to farm owner', async () => {
      const req = createRequest({
        params: { farmId: farm1._id },
        user: { id: user1._id }
      });
      const res = createResponse();
      const next = jest.fn();
      
      await checkFarmAccess('viewer')(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined(); // No error
      expect(req.farm).toBeDefined();
      expect(req.userRole).toBe('owner');
      expect(req.isFarmOwner).toBe(true);
    });
    
    it('should allow access to farm user with sufficient role', async () => {
      const req = createRequest({
        params: { farmId: farm1._id },
        user: { id: user2._id }
      });
      const res = createResponse();
      const next = jest.fn();
      
      await checkFarmAccess('manager')(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined(); // No error
      expect(req.farm).toBeDefined();
      expect(req.userRole).toBe('manager');
      expect(req.isFarmOwner).toBe(false);
    });
    
    it('should deny access to user with insufficient role', async () => {
      const req = createRequest({
        params: { farmId: farm2._id },
        user: { id: user1._id } // user1 is a viewer in farm2
      });
      const res = createResponse();
      const next = jest.fn();
      
      await checkFarmAccess('manager')(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorResponse);
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
    
    it('should deny access to non-member user', async () => {
      const nonMember = await User.create({
        username: 'nonmember',
        email: 'nonmember@example.com',
        password: 'password123'
      });
      
      const req = createRequest({
        params: { farmId: farm1._id },
        user: { id: nonMember._id }
      });
      const res = createResponse();
      const next = jest.fn();
      
      await checkFarmAccess('viewer')(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorResponse);
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });
  
  describe('isFarmOwner', () => {
    it('should allow farm owner', () => {
      const req = {
        farm: { owner: user1._id },
        user: { id: user1._id }
      };
      const res = createResponse();
      const next = jest.fn();
      
      isFarmOwner(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined(); // No error
    });
    
    it('should deny non-owner', () => {
      const req = {
        farm: { owner: user1._id },
        user: { id: user2._id }
      };
      const res = createResponse();
      const next = jest.fn();
      
      isFarmOwner(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorResponse);
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });
  
  describe('isFarmAdmin', () => {
    it('should allow farm owner', () => {
      const req = {
        farm: { owner: user1._id },
        user: { id: user1._id },
        userRole: 'owner'
      };
      const res = createResponse();
      const next = jest.fn();
      
      isFarmAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined(); // No error
    });
    
    it('should allow farm manager', () => {
      const req = {
        farm: { owner: user1._id },
        user: { id: user2._id },
        userRole: 'manager'
      };
      const res = createResponse();
      const next = jest.fn();
      
      isFarmAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined(); // No error
    });
    
    it('should deny non-admin user', () => {
      const req = {
        farm: { owner: user1._id },
        user: { id: user2._id },
        userRole: 'viewer'
      };
      const res = createResponse();
      const next = jest.fn();
      
      isFarmAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorResponse);
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });
  
  describe('hasFarmRole', () => {
    it('should allow user with any farm access when no roles specified', async () => {
      const req = { user: { id: user1._id } };
      const res = createResponse();
      const next = jest.fn();
      
      await hasFarmRole()(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined(); // No error
    });
    
    it('should allow user with specific role', async () => {
      const req = { user: { id: user1._id } };
      const res = createResponse();
      const next = jest.fn();
      
      await hasFarmRole(['owner', 'manager'])(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined(); // No error
    });
    
    it('should deny user without required role', async () => {
      // user2 is only a viewer in farm1
      const req = { user: { id: user2._id } };
      const res = createResponse();
      const next = jest.fn();
      
      await hasFarmRole(['manager'])(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeInstanceOf(ErrorResponse);
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });
});
