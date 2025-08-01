const request = require('supertest');
const config = require('./config');

/**
 * Helper function to authenticate a test user
 * @param {Object} server - The test server instance
 * @param {Object} credentials - User credentials {email, password}
 * @returns {Promise<string>} - JWT token
 */
const authenticateTestUser = async (server, credentials) => {
  const res = await request(server)
    .post('/api/v1/auth/login')
    .send({
      email: credentials.email,
      password: credentials.password
    });
  
  if (res.statusCode !== 200 || !res.body.token) {
    throw new Error(`Authentication failed: ${JSON.stringify(res.body)}`);
  }
  
  return res.body.token;
};

/**
 * Create an authenticated request with JWT token
 * @param {Object} server - The test server instance
 * @param {string} method - HTTP method (get, post, put, delete, etc.)
 * @param {string} url - API endpoint URL
 * @param {string} token - JWT token
 * @param {Object} [data] - Request body (for POST/PUT requests)
 * @returns {Object} - SuperTest request object
 */
const createAuthenticatedRequest = (server, method, url, token, data = null) => {
  const req = request(server)[method](url)
    .set('Authorization', `Bearer ${token}`)
    .set('Accept', 'application/json');
  
  if (data) {
    return req.send(data);
  }
  
  return req;
};

/**
 * Create a test farm
 * @param {Object} server - The test server instance
 * @param {string} token - JWT token of an admin/owner
 * @param {Object} farmData - Farm data
 * @returns {Promise<Object>} - Created farm data
 */
const createTestFarm = async (server, token, farmData) => {
  const res = await createAuthenticatedRequest(
    server,
    'post',
    '/api/v1/farms',
    token,
    farmData
  );
  
  if (res.statusCode !== 201) {
    throw new Error(`Failed to create test farm: ${JSON.stringify(res.body)}`);
  }
  
  return res.body.data;
};

/**
 * Create a test cattle
 * @param {Object} server - The test server instance
 * @param {string} token - JWT token with appropriate permissions
 * @param {string} farmId - ID of the farm to add the cattle to
 * @param {Object} cattleData - Cattle data
 * @returns {Promise<Object>} - Created cattle data
 */
const createTestCattle = async (server, token, farmId, cattleData) => {
  const res = await createAuthenticatedRequest(
    server,
    'post',
    `/api/v1/farms/${farmId}/cattle`,
    token,
    cattleData
  );
  
  if (res.statusCode !== 201) {
    throw new Error(`Failed to create test cattle: ${JSON.stringify(res.body)}`);
  }
  
  return res.body.data;
};

/**
 * Create a test health reading
 * @param {Object} server - The test server instance
 * @param {string} token - JWT token with appropriate permissions
 * @param {string} cattleId - ID of the cattle
 * @param {Object} readingData - Health reading data
 * @returns {Promise<Object>} - Created health reading data
 */
const createTestHealthReading = async (server, token, cattleId, readingData) => {
  const res = await createAuthenticatedRequest(
    server,
    'post',
    `/api/v1/cattle/${cattleId}/health`,
    token,
    readingData
  );
  
  if (res.statusCode !== 201) {
    throw new Error(`Failed to create test health reading: ${JSON.stringify(res.body)}`);
  }
  
  return res.body.data;
};

module.exports = {
  authenticateTestUser,
  createAuthenticatedRequest,
  createTestFarm,
  createTestCattle,
  createTestHealthReading,
  ...config
};
