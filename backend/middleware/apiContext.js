const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');

/**
 * Middleware to set API context for multi-tenancy
 * This should be used after authentication middleware
 */
const setApiContext = asyncHandler(async (req, res, next) => {
  // Skip for auth routes
  if (req.path.startsWith('/api/v1/auth')) {
    return next();
  }

  // For superadmins, allow bypassing tenant context
  if (req.user?.role === 'superadmin' && req.headers['x-tenant-id']) {
    req.tenantId = req.headers['x-tenant-id'];
    return next();
  }

  // For regular users, use their tenant ID
  if (req.user?.tenantId) {
    req.tenantId = req.user.tenantId;
    return next();
  }

  // If no tenant context is available but the route requires it
  if (req.headers['x-tenant-id']) {
    req.tenantId = req.headers['x-tenant-id'];
    return next();
  }

  // If we reach here, the request doesn't have proper tenant context
  return next(
    new ErrorResponse('Tenant context is required for this request', 400)
  );
});

/**
 * Middleware to validate API key and set tenant context
 */
const validateApiKey = asyncHandler(async (req, res, next) => {
  // Skip for auth routes
  if (req.path.startsWith('/api/v1/auth')) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return next(new ErrorResponse('API key is required', 401));
  }

  // In a real implementation, you would validate the API key against your database
  // and set the tenant context based on the API key
  try {
    // Example: Find tenant by API key
    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findOne({ apiKey, isActive: true });
    
    if (!tenant) {
      return next(new ErrorResponse('Invalid API key', 401));
    }
    
    // Set tenant context
    req.tenantId = tenant._id;
    req.tenant = tenant;
    
    // Set API client info (if needed)
    req.apiClient = {
      id: tenant._id,
      name: tenant.name,
      permissions: ['read:cattle', 'read:health'] // Default read-only permissions for API clients
    };
    
    next();
  } catch (err) {
    return next(new ErrorResponse('Error validating API key', 500));
  }
});

/**
 * Middleware to set response headers for API versioning
 */
const setApiVersion = (version = '1.0.0') => {
  return (req, res, next) => {
    res.setHeader('X-API-Version', version);
    next();
  };
};

/**
 * Middleware to check if the current user has access to the requested resource
 * based on tenant context
 */
const checkResourceAccess = (modelName, idParam = 'id', ownerField = 'user') => {
  return asyncHandler(async (req, res, next) => {
    const Model = require(`../models/${modelName}`);
    const resource = await Model.findOne({
      _id: req.params[idParam],
      tenantId: req.tenantId
    });

    if (!resource) {
      return next(
        new ErrorResponse(
          `${modelName} not found with id of ${req.params[idParam]}`,
          404
        )
      );
    }

    // Allow superadmins to access any resource
    if (req.user?.role === 'superadmin') {
      req.resource = resource;
      return next();
    }

    // Check if the resource belongs to the user's tenant
    if (resource.tenantId.toString() !== req.tenantId.toString()) {
      return next(
        new ErrorResponse('Not authorized to access this resource', 403)
      );
    }

    // Check ownership if ownerField is specified
    if (ownerField && resource[ownerField]) {
      const ownerId = resource[ownerField]._id || resource[ownerField];
      
      if (ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
          new ErrorResponse('Not authorized to access this resource', 403)
        );
      }
    }

    // Attach resource to request for use in route handlers
    req.resource = resource;
    next();
  });
};

module.exports = {
  setApiContext,
  validateApiKey,
  setApiVersion,
  checkResourceAccess
};
