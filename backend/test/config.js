module.exports = {
  // Test server configuration
  testServer: {
    port: 3002,
    host: 'http://localhost'
  },
  
  // Test database configuration
  database: {
    name: 'cattle_health_test',
    uri: 'mongodb://localhost:27017/cattle_health_test'
  },
  
  // Test user credentials
  testUsers: {
    admin: {
      email: 'admin@cattlehealth.com',
      password: 'password123',
      role: 'super_admin'
    },
    farmOwner: {
      email: 'john.doe@greenvalley.com',
      password: 'password123',
      role: 'farm_owner'
    },
    veterinarian: {
      email: 'jane.smith@greenvalley.com',
      password: 'password123',
      role: 'veterinarian'
    },
    farmManager: {
      email: 'mike.johnson@greenvalley.com',
      password: 'password123',
      role: 'farm_manager'
    },
    worker: {
      email: 'david@sunnyacres.com',
      password: 'password123',
      role: 'worker'
    }
  },
  
  // Test farm data
  testFarms: {
    greenValley: '64c1f5a5e4a8f6b8d4f3e2a1',
    sunnyAcres: '64c1f5a5e4a8f6b8d4f3e2a2'
  },
  
  // Test cattle data
  testCattle: {
    daisy: '64c1f5a5e4a8f6b8d4f3e2b1',
    bella: '64c1f5a5e4a8f6b8d4f3e2b2',
    bruno: '64c1f5a5e4a8f6b8d4f3e2b3',
    luna: '64c1f5a5e4a8f6b8d4f3e2b4'
  }
};
