// Setup test environment
process.env.NODE_ENV = 'test';

// Increase timeout for tests that interact with the database
jest.setTimeout(30000);

// Set up global test hooks
beforeAll(async () => {
  // Any global setup before all tests
});

afterAll(async () => {
  // Any global teardown after all tests
});

// Global test error handler
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
