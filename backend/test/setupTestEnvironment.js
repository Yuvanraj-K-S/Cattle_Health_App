const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { testServer } = require('./testHelpers');

let mongoServer;

/**
 * Set up the test environment before running tests
 */
const setupTestEnvironment = async () => {
  try {
    // Start in-memory MongoDB server for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    
    console.log('Test MongoDB connected');
    
    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = mongoUri;
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.JWT_EXPIRE = '30d';
    process.env.PORT = testServer.port;
    
    // Import seed data
    await require('../seeds/index').importData();
    
    // Start the Express app
    const app = require('../server');
    const server = app.listen(testServer.port, () => {
      console.log(`Test server running on port ${testServer.port}`);
    });
    
    // Add server to global for cleanup
    global.__TEST_SERVER__ = server;
    
    // Add a small delay to ensure the server is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { server, mongoUri };
  } catch (error) {
    console.error('Failed to set up test environment:', error);
    await tearDownTestEnvironment();
    throw error;
  }
};

/**
 * Clean up the test environment after tests are done
 */
const tearDownTestEnvironment = async () => {
  try {
    // Close the Express server
    if (global.__TEST_SERVER__) {
      await new Promise(resolve => global.__TEST_SERVER__.close(resolve));
      console.log('Test server closed');
    }
    
    // Close the database connection
    if (mongoose.connection) {
      await mongoose.disconnect();
      console.log('Test database disconnected');
    }
    
    // Stop the in-memory MongoDB server
    if (mongoServer) {
      await mongoServer.stop();
      console.log('Test MongoDB server stopped');
    }
  } catch (error) {
    console.error('Error during test teardown:', error);
    throw error;
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  tearDownTestEnvironment().then(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  tearDownTestEnvironment().then(() => process.exit(1));
});

module.exports = {
  setupTestEnvironment,
  tearDownTestEnvironment
};
