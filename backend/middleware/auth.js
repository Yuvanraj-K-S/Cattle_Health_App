const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Farm = require('../models/Farm');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');

// Protect routes - User must be authenticated
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(
      new ErrorResponse('Not authorized to access this route', 401)
    );
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token
    req.user = await User.findById(decoded.id).select('-password');
    
    // Check if user exists and is active
    if (!req.user || !req.user.isActive) {
      return next(
        new ErrorResponse('User account is inactive or does not exist', 401)
      );
    }

    // Set last login time
    req.user.lastLogin = Date.now();
    await req.user.save({ validateBeforeSave: false });

    // Set user in response locals for templates
    res.locals.user = req.user;
    
    next();
  } catch (err) {
    return next(
      new ErrorResponse('Not authorized to access this route', 401)
    );
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
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

// Check farm membership and permissions
exports.checkFarmAccess = (requiredPermission) => {
  return asyncHandler(async (req, res, next) => {
    // Get farm ID from params or body
    const farmId = req.params.farmId || req.body.farm;
    
    if (!farmId) {
      return next(
        new ErrorResponse('Farm ID is required', 400)
      );
    }

    // Check if user is a super admin (bypasses farm checks)
    if (req.user.role === 'super_admin') {
      req.farm = await Farm.findById(farmId);
      if (!req.farm) {
        return next(
          new ErrorResponse(`Farm not found with id of ${farmId}`, 404)
        );
      }
      return next();
    }

    // Find the user's role for this farm
    const farmMembership = req.user.farms.find(
      f => f.farm && f.farm.toString() === farmId.toString()
    );

    if (!farmMembership) {
      return next(
        new ErrorResponse(
          `User is not a member of farm with id ${farmId}`,
          403
        )
      );
    }

    // Get farm details
    req.farm = await Farm.findById(farmId);
    if (!req.farm) {
      return next(
        new ErrorResponse(`Farm not found with id of ${farmId}`, 404)
      );
    }

    // Check if permission is required and user has it
    if (requiredPermission) {
      const hasPermission = await checkFarmPermission(
        farmMembership.role,
        requiredPermission
      );
      
      if (!hasPermission) {
        return next(
          new ErrorResponse(
            `User does not have permission to ${requiredPermission} on this farm`,
            403
          )
        );
      }
    }

    // Add farm role to request for use in controllers
    req.farmRole = farmMembership.role;
    next();
  });
};

// Check if a role has the required permission
const checkFarmPermission = (role, requiredPermission) => {
  const permissions = {
    owner: ['manage_users', 'manage_cattle', 'view_reports', 'manage_devices', 'view_dashboard'],
    manager: ['manage_cattle', 'view_reports', 'view_dashboard'],
    veterinarian: ['manage_cattle', 'view_reports', 'view_dashboard'],
    worker: ['view_dashboard'],
    viewer: ['view_dashboard']
  };

  const rolePermissions = permissions[role] || [];
  return rolePermissions.includes(requiredPermission);
};

// Check cattle ownership or farm access
exports.checkCattleAccess = asyncHandler(async (req, res, next) => {
  const Cattle = require('../models/Cattle');
  
  // For POST requests, check if user has access to the farm
  if (req.method === 'POST') {
    if (!req.body.farm) {
      return next(
        new ErrorResponse('Farm ID is required', 400)
      );
    }
    
    // This will set req.farm and check permissions
    return exports.checkFarmAccess('manage_cattle')(req, res, next);
  }
  
  // For other methods, check access to specific cattle
  const cattle = await Cattle.findById(req.params.id);
  
  if (!cattle) {
    return next(
      new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check if user is the owner or has farm access
  const isOwner = cattle.owner && cattle.owner.toString() === req.user._id.toString();
  const hasFarmAccess = req.user.farms.some(
    f => f.farm && f.farm.toString() === cattle.farm.toString()
  );
  
  if (!isOwner && !hasFarmAccess && req.user.role !== 'super_admin') {
    return next(
      new ErrorResponse(
        `Not authorized to access cattle with id ${req.params.id}`,
        403
      )
    );
  }
  
  // Add cattle to request object
  req.cattle = cattle;
  next();
});

// Rate limiting middleware
exports.rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs, // 15 minutes
    max, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    keyGenerator: (req) => {
      return req.ip; // IP-based rate limiting
    },
    handler: (req, res, next) => {
      next(
        new ErrorResponse(
          `Too many requests, please try again later.`, 429
        )
      );
    }
  });
};
