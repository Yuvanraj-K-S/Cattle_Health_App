# Multi-tenancy Implementation Guide

This document provides an overview of the multi-tenant architecture and how to work with it.

## Architecture Overview

The system uses a shared database with tenant isolation through:
- Tenant ID on all tenant-specific models
- Middleware for automatic tenant context
- Row-level security through query filters

## Key Components

### 1. Tenant Model
- Stores tenant information and configuration
- Manages subscription status and features
- Handles tenant-specific settings

### 2. Middleware
- `tenantContext.js`: Sets tenant context for each request
- `permissions.js`: Handles role-based access control
- `apiContext.js`: Manages API request context

### 3. Base Controller
- Provides common CRUD operations with tenant isolation
- Handles pagination, sorting, and filtering
- Enforces data access rules

## Development Guidelines

### Adding New Models
1. Add `tenantId` field to your schema:
   ```javascript
   const schema = new mongoose.Schema({
     tenantId: {
       type: mongoose.Schema.Types.ObjectId,
       required: true,
       index: true
     },
     // other fields...
   });
   ```

2. Apply the tenant plugin:
   ```javascript
   const { tenantPlugin } = require('./middleware/tenantContext');
   schema.plugin(tenantPlugin);
   ```

### Creating Controllers
1. Extend BaseController:
   ```javascript
   const BaseController = require('./BaseController');
   const MyModel = require('../models/MyModel');
   
   class MyController extends BaseController {
     constructor() {
       super(MyModel);
     }
     
     // Add custom methods here
   }
   ```

### Testing
1. Use the test helper functions:
   ```javascript
   const { setupTestTenant, createTestUser } = require('../test/testHelpers');
   
   describe('My Feature', () => {
     let testTenant;
     let testUser;
     
     beforeAll(async () => {
       testTenant = await setupTestTenant();
       testUser = await createTestUser(testTenant, 'user');
     });
   });
   ```

## API Endpoints

### Tenant Management
- `POST /api/v1/tenants` - Create new tenant (superadmin only)
- `GET /api/v1/tenants` - List all tenants (superadmin only)
- `GET /api/v1/tenants/:id` - Get tenant details
- `PUT /api/v1/tenants/:id` - Update tenant
- `DELETE /api/v1/tenants/:id` - Delete tenant (superadmin only)

### User Management
- `POST /api/v1/tenants/:tenantId/users` - Add user to tenant (tenant admin)
- `GET /api/v1/tenants/:tenantId/users` - List tenant users

## Security Considerations

1. Always use the BaseController for CRUD operations
2. Never disable tenant filtering in production
3. Validate user permissions before sensitive operations
4. Use the `checkPermissions` middleware for route protection
5. Log all admin actions for audit purposes

## Common Patterns

### Accessing Tenant Context
```javascript
// In route handlers
const tenantId = req.tenantId;
const tenant = req.tenant;
```

### Checking Permissions
```javascript
// In route definitions
router.get(
  '/protected',
  protect,
  checkPermissions('read:protected'),
  controller.protectedAction
);
```

### Custom Queries with Tenant Filtering
```javascript
// Use the tenant context
const results = await MyModel.find({ 
  tenantId: req.tenantId,
  // other filters...
});

// Or use the tenant context directly
const results = await MyModel.find({ 
  ...req.tenantContext,
  // other filters...
});
```

## Troubleshooting

### Common Issues
1. **Missing Tenant Context**
   - Ensure all routes go through the `setTenantContext` middleware
   - Verify the user has a valid tenant association

2. **Permission Denied**
   - Check user roles and permissions
   - Verify the tenant's subscription status

3. **Data Leakage**
   - Never disable tenant filtering in production
   - Always test with multiple tenants

## Deployment

### Environment Variables
```
NODE_ENV=production
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_uri
SESSION_SECRET=your_session_secret
```

## Monitoring and Maintenance

1. **Logging**
   - Monitor for failed authentication attempts
   - Log all admin actions
   - Track tenant resource usage

2. **Backup**
   - Regular database backups
   - Test restoration procedures

3. **Updates**
   - Keep dependencies updated
   - Test with multiple tenants before deploying updates
