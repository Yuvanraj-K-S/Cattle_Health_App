const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { checkPermissions } = require('../middleware/permissions');

// @desc    Get all tenants (Admin only)
// @route   GET /api/v1/tenants
// @access  Private/Admin
exports.getTenants = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single tenant
// @route   GET /api/v1/tenants/:id
// @access  Private/Admin or Tenant Admin
exports.getTenant = asyncHandler(async (req, res, next) => {
  const tenant = await Tenant.findById(req.params.id);
  
  if (!tenant) {
    return next(
      new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check permissions
  if (
    req.user.role !== 'superadmin' && 
    req.user.tenantId.toString() !== tenant._id.toString() &&
    !req.user.isTenantAdmin
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this tenant`,
        401
      )
    );
  }
  
  res.status(200).json({
    success: true,
    data: tenant
  });
});

// @desc    Create new tenant
// @route   POST /api/v1/tenants
// @access  Private/Admin
exports.createTenant = asyncHandler(async (req, res, next) => {
  // Only superadmins can create tenants
  if (req.user.role !== 'superadmin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to create tenants`,
        401
      )
    );
  }
  
  // Add createdBy
  req.body.createdBy = req.user.id;
  
  const tenant = await Tenant.create(req.body);
  
  // Make the creator a tenant admin
  await User.findByIdAndUpdate(req.user.id, {
    tenantId: tenant._id,
    isTenantAdmin: true,
    role: 'admin'
  });
  
  res.status(201).json({
    success: true,
    data: tenant
  });
});

// @desc    Update tenant
// @route   PUT /api/v1/tenants/:id
// @access  Private/Admin or Tenant Admin
exports.updateTenant = asyncHandler(async (req, res, next) => {
  let tenant = await Tenant.findById(req.params.id);
  
  if (!tenant) {
    return next(
      new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check permissions
  if (
    req.user.role !== 'superadmin' && 
    !(req.user.tenantId.toString() === tenant._id.toString() && req.user.isTenantAdmin)
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this tenant`,
        401
      )
    );
  }
  
  // Prevent changing certain fields for non-superadmins
  if (req.user.role !== 'superadmin') {
    const protectedFields = ['subscriptionStatus', 'subscriptionPlan', 'subscriptionEndDate'];
    protectedFields.forEach(field => {
      if (req.body[field]) {
        delete req.body[field];
      }
    });
  }
  
  tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: tenant
  });
});

// @desc    Delete tenant
// @route   DELETE /api/v1/tenants/:id
// @access  Private/Admin
exports.deleteTenant = asyncHandler(async (req, res, next) => {
  const tenant = await Tenant.findById(req.params.id);
  
  if (!tenant) {
    return next(
      new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Only superadmins can delete tenants
  if (req.user.role !== 'superadmin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete tenants`,
        401
      )
    );
  }
  
  // This will trigger the pre-remove middleware to delete related data
  await tenant.remove();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get tenant users
// @route   GET /api/v1/tenants/:id/users
// @access  Private/Admin or Tenant Admin
exports.getTenantUsers = asyncHandler(async (req, res, next) => {
  const tenant = await Tenant.findById(req.params.id);
  
  if (!tenant) {
    return next(
      new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check permissions
  if (
    req.user.role !== 'superadmin' && 
    req.user.tenantId.toString() !== tenant._id.toString() &&
    !req.user.isTenantAdmin
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to view these users`,
        401
      )
    );
  }
  
  const users = await User.find({ tenantId: tenant._id })
    .select('-password -refreshToken -refreshTokenExpire')
    .sort('lastName firstName');
  
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Add user to tenant
// @route   POST /api/v1/tenants/:id/users
// @access  Private/Admin or Tenant Admin
exports.addTenantUser = asyncHandler(async (req, res, next) => {
  // Implementation for adding users to tenant
  // This would typically be called by tenant admins to add new users to their tenant
  
  const tenant = await Tenant.findById(req.params.id);
  
  if (!tenant) {
    return next(
      new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check permissions
  if (
    req.user.role !== 'superadmin' && 
    !(req.user.tenantId.toString() === tenant._id.toString() && req.user.isTenantAdmin)
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to add users to this tenant`,
        401
      )
    );
  }
  
  // Check if user already exists with this email
  let user = await User.findOne({ email: req.body.email });
  
  if (user) {
    // If user exists but is not in this tenant
    if (user.tenantId && user.tenantId.toString() !== tenant._id.toString()) {
      return next(
        new ErrorResponse(
          'User already exists in another tenant',
          400
        )
      );
    }
    
    // Update existing user
    user = await User.findByIdAndUpdate(
      user._id,
      {
        tenantId: tenant._id,
        role: req.body.role || 'user',
        isActive: true
      },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -refreshTokenExpire');
  } else {
    // Create new user
    req.body.tenantId = tenant._id;
    req.body.role = req.body.role || 'user';
    req.body.password = 'temp-password-' + Math.random().toString(36).slice(-8);
    req.body.isVerified = true;
    
    user = await User.create(req.body);
    
    // TODO: Send welcome email with password reset link
  }
  
  // Add user to tenant members if not already added
  if (!tenant.members.some(member => member.user.toString() === user._id.toString())) {
    tenant.members.push({
      user: user._id,
      role: req.body.role || 'user',
      addedBy: req.user.id
    });
    
    await tenant.save();
  }
  
  res.status(201).json({
    success: true,
    data: user
  });
});
