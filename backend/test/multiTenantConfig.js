module.exports = {
  // Test database configuration for multi-tenant tests
  database: {
    name: 'cattle_health_multi_tenant_test',
    uri: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/cattle_health_multi_tenant_test'
  },
  
  // Test tenant configurations
  tenants: {
    // Default tenant configuration
    defaultTenant: {
      name: 'Default Test Tenant',
      slug: 'default-tenant',
      contactEmail: 'default@test.com',
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
      settings: {
        maxUsers: 10,
        maxCattle: 1000,
        features: {
          advancedAnalytics: true,
          customReports: true,
          apiAccess: true
        }
      }
    },
    
    // Trial tenant configuration
    trialTenant: {
      name: 'Trial Tenant',
      slug: 'trial-tenant',
      contactEmail: 'trial@test.com',
      subscriptionPlan: 'trial',
      subscriptionStatus: 'trial',
      settings: {
        maxUsers: 2,
        maxCattle: 50,
        features: {
          advancedAnalytics: false,
          customReports: false,
          apiAccess: false
        }
      }
    },
    
    // Inactive tenant configuration
    inactiveTenant: {
      name: 'Inactive Tenant',
      slug: 'inactive-tenant',
      contactEmail: 'inactive@test.com',
      subscriptionPlan: 'free',
      subscriptionStatus: 'expired',
      isActive: false,
      settings: {
        maxUsers: 1,
        maxCattle: 10,
        features: {
          advancedAnalytics: false,
          customReports: false,
          apiAccess: false
        }
      }
    }
  },
  
  // Test user roles and permissions
  roles: {
    superAdmin: {
      role: 'superadmin',
      permissions: [
        'read:all', 'write:all', 'delete:all',
        'manage:tenants', 'manage:users', 'manage:settings'
      ]
    },
    tenantAdmin: {
      role: 'admin',
      isTenantAdmin: true,
      permissions: [
        'read:users', 'write:users',
        'read:cattle', 'write:cattle', 'delete:cattle',
        'read:health', 'write:health', 'delete:health',
        'manage:settings'
      ]
    },
    manager: {
      role: 'manager',
      permissions: [
        'read:users',
        'read:cattle', 'write:cattle',
        'read:health', 'write:health'
      ]
    },
    user: {
      role: 'user',
      permissions: [
        'read:cattle',
        'read:health', 'write:health'
      ]
    },
    readonly: {
      role: 'readonly',
      permissions: [
        'read:cattle',
        'read:health'
      ]
    }
  },
  
  // Test data for cattle and health records
  testData: {
    cattle: {
      dairyCow: {
        tagId: 'COW-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        name: 'Bessie',
        breed: 'Holstein',
        dateOfBirth: new Date('2020-01-15'),
        gender: 'female',
        status: 'active',
        healthStatus: 'healthy'
      },
      beefCow: {
        tagId: 'BEEF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        name: 'Daisy',
        breed: 'Angus',
        dateOfBirth: new Date('2019-05-20'),
        gender: 'female',
        status: 'active',
        healthStatus: 'healthy'
      }
    },
    healthRecords: {
      normalTemp: {
        temperature: 38.5, // Normal cow temperature in Celsius
        heartRate: 65, // Normal heart rate (beats per minute)
        respiratoryRate: 25, // Normal respiratory rate (breaths per minute)
        weight: 650, // kg
        notes: 'Regular checkup - all vitals normal'
      },
      fever: {
        temperature: 40.2, // Elevated temperature (fever)
        heartRate: 80,
        respiratoryRate: 35,
        weight: 640,
        notes: 'Elevated temperature observed, monitor closely'
      }
    }
  },
  
  // Test API configuration
  api: {
    basePath: '/api/v1',
    defaultHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 10000 // 10 seconds
  }
};
