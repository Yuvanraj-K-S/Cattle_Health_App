const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');

/**
 * Middleware to set tenant context for multi-tenancy
 * This should be used after authentication middleware
 */
const setTenantContext = asyncHandler(async (req, res, next) => {
  // Skip for auth routes
  if (req.path.startsWith('/api/v1/auth')) {
    return next();
  }

  // Skip for superadmin
  if (req.user?.role === 'superadmin') {
    return next();
  }

  // Get tenant ID from user or request
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  if (!tenantId) {
    return next(
      new ErrorResponse('Tenant context is required', 400)
    );
  }

  // Verify tenant exists and is active
  const Tenant = mongoose.model('Tenant');
  const tenant = await Tenant.findOne({
    _id: tenantId,
    isActive: true
  });

  if (!tenant) {
    return next(
      new ErrorResponse('Tenant not found or inactive', 404)
    );
  }

  // Check subscription status for non-superadmin users
  if (req.user?.role !== 'superadmin' && !tenant.hasActiveSubscription()) {
    return next(
      new ErrorResponse('Tenant subscription is not active', 403)
    );
  }

  // Attach tenant to request
  req.tenant = tenant;
  req.tenantId = tenant._id;

  // Set tenant context for all database queries
  mongoose.tenantId = tenant._id;

  next();
});

/**
 * Plugin to automatically add tenant ID to queries
 * Should be added to tenant-aware models
 */
const tenantPlugin = (schema) => {
  // Add tenantId field to schema
  schema.add({
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    }
  });

  // Apply tenant context to all queries
  schema.pre(/^find/, function(next) {
    // Skip if no tenant context or if explicitly bypassed
    if (!mongoose.tenantId || this._bypassTenant) {
      return next();
    }

    // Apply tenant filter
    if (this.getFilter().tenantId === undefined) {
      this.find({ tenantId: mongoose.tenantId });
    }
    next();
  });

  // Validate tenant ID on save
  schema.pre('save', function(next) {
    if (!this.tenantId && mongoose.tenantId) {
      this.tenantId = mongoose.tenantId;
    }
    next();
  });
};

/**
 * Middleware to bypass tenant filtering for specific routes
 * Use with caution - only for system-wide operations
 */
const bypassTenant = (req, res, next) => {
  req._bypassTenant = true;
  next();
};

module.exports = {
  setTenantContext,
  tenantPlugin,
  bypassTenant
};
