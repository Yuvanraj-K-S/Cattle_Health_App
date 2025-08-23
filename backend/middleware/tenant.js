const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');

/**
 * Middleware to set tenant context for multi-tenancy
 * Extracts tenant ID from JWT and attaches it to the request
 */
exports.setTenantContext = asyncHandler(async (req, res, next) => {
  // Skip for auth routes
  if (req.path.startsWith('/api/v1/auth')) {
    return next();
  }

  // Get tenant ID from JWT or request headers
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  if (!tenantId) {
    return next(
      new ErrorResponse('Tenant context is required', 400)
    );
  }

  // Verify tenant access
  if (req.user && req.user.tenantId.toString() !== tenantId) {
    return next(
      new ErrorResponse('Not authorized to access this tenant', 403)
    );
  }

  // Attach tenant ID to request
  req.tenantId = tenantId;
  next();
});

/**
 * Middleware to verify user has access to the requested tenant
 */
exports.verifyTenantAccess = (requiredRole = 'member') => {
  return asyncHandler(async (req, res, next) => {
    // Skip for super admins
    if (req.user.role === 'superadmin') {
      return next();
    }

    // For other roles, check tenant membership and role
    const tenant = await Tenant.findOne({
      _id: req.tenantId,
      'members.user': req.user._id,
      'members.role': { $in: [requiredRole, 'admin'] } // Admins have all permissions
    });

    if (!tenant) {
      return next(
        new ErrorResponse('Not authorized to access this tenant', 403)
      );
    }

    // Attach tenant info to request
    req.tenant = tenant;
    next();
  });
};
