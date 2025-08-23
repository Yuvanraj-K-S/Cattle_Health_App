const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');

/**
 * Middleware to check if user has required permissions
 * @param {...string} requiredPermissions - List of required permissions
 * @returns {Function} - Express middleware function
 */
const checkPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    // Skip permission check for superadmin
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission => {
      return (
        // Check direct permissions
        req.user.permissions?.includes(permission) ||
        // Check role-based permissions
        (req.user.role === 'admin' && permission.startsWith('manage:')) ||
        // Check tenant admin status for tenant-level permissions
        (req.user.isTenantAdmin && permission.startsWith('tenant:'))
      );
    });

    if (!hasAllPermissions) {
      return next(
        new ErrorResponse(
          `User is not authorized to perform this action. Required permissions: ${requiredPermissions.join(', ')}`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the specified roles
 * @param {...string} roles - List of allowed roles
 * @returns {Function} - Express middleware function
 */
const checkRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Middleware to check resource ownership
 * @param {string} modelName - Name of the model to check
 * @param {string} paramName - Name of the route parameter containing the resource ID
 * @param {string} [userField='user'] - Field in the model that references the user
 * @returns {Function} - Express middleware function
 */
const checkOwnership = (modelName, paramName = 'id', userField = 'user') => {
  return asyncHandler(async (req, res, next) => {
    const Model = require(`../models/${modelName}`);
    const resource = await Model.findById(req.params[paramName]);

    if (!resource) {
      return next(
        new ErrorResponse(
          `Resource not found with id of ${req.params[paramName]}`,
          404
        )
      );
    }

    // Allow if user is superadmin or tenant admin
    if (req.user.role === 'superadmin' || req.user.isTenantAdmin) {
      return next();
    }

    // Check if user is the owner of the resource
    if (resource[userField].toString() !== req.user.id) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to update this resource`,
          401
        )
      );
    }

    // Attach resource to request for use in route handlers
    req.resource = resource;
    next();
  });
};

/**
 * Middleware to check if user is a member of the tenant
 * @param {string} [idParam='tenantId'] - Name of the parameter containing the tenant ID
 * @returns {Function} - Express middleware function
 */
const checkTenantMembership = (idParam = 'tenantId') => {
  return asyncHandler(async (req, res, next) => {
    const tenantId = req.params[idParam] || req.body.tenantId;
    
    if (!tenantId) {
      return next(new ErrorResponse('Tenant ID is required', 400));
    }

    // Superadmins can access any tenant
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Check if user is a member of the tenant
    const isMember = await mongoose.model('Tenant').exists({
      _id: tenantId,
      $or: [
        { 'members.user': req.user.id },
        { createdBy: req.user.id }
      ]
    });

    if (!isMember) {
      return next(
        new ErrorResponse('Not authorized to access this tenant', 403)
      );
    }

    next();
  });
};

module.exports = {
  checkPermissions,
  checkRoles,
  checkOwnership,
  checkTenantMembership
};
