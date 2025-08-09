const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./async');
const Farm = require('../models/Farm');
const logger = require('../utils/logger');

// @desc    Check if user has access to a farm as farm_owner
// @returns {Function} Middleware function
const checkFarmAccess = () => {
  return asyncHandler(async (req, res, next) => {
    try {
      const farmId = req.params.farmId || req.body.farmId;
      const userId = req.user.id;
      
      if (!farmId) {
        return next(new ErrorResponse('Farm ID is required', 400));
      }
      
      // Find the farm with the requesting user as owner
      const farm = await Farm.findOne({
        _id: farmId,
        owner: userId
      });
      
      if (!farm) {
        logger.warn(`Farm not found or access denied: User ${userId} tried to access farm ${farmId}`);
        return next(new ErrorResponse('Not authorized to access this farm', 403));
      }
      
      // Attach farm and user role to request object
      req.farm = farm;
      req.userRole = 'farm_owner';
      req.isFarmOwner = true;
      
      next();
    } catch (error) {
      logger.error(`Farm access check error: ${error.message}`, { error });
      next(error);
    }
  });
};

// @desc    Check if user is a farm owner
const isFarmOwner = (req, res, next) => {
  if (!req.farm || !req.user) {
    return next(new ErrorResponse('Farm or user information not found', 500));
  }
  
  const isOwner = req.farm.owner.toString() === req.user.id.toString();
  
  if (!isOwner) {
    return next(new ErrorResponse('Not authorized as farm owner', 403));
  }
  
  req.isFarmOwner = true;
  next();
};

// @desc    Check if user is a farm admin (for compatibility, redirects to isFarmOwner)
const isFarmAdmin = (req, res, next) => {
  return isFarmOwner(req, res, next);
};

// @desc    Check if user has a specific role in any farm
const hasFarmRole = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ErrorResponse('User not authenticated', 401));
      }
      
      // If no specific roles provided, just check if user has any farm access
      if (roles.length === 0) {
        const farmCount = await Farm.countDocuments({
          $or: [
            { owner: req.user.id },
            { 'users.user': req.user.id, 'users.isActive': true }
          ]
        });
        
        if (farmCount === 0) {
          return next(new ErrorResponse('No farm access found', 403));
        }
        
        return next();
      }
      
      // Check for specific roles
      const farm = await Farm.findOne({
        $or: [
          { owner: req.user.id },
          { 
            'users.user': req.user.id, 
            'users.role': { $in: roles },
            'users.isActive': true
          }
        ]
      });
      
      if (!farm) {
        return next(new ErrorResponse(`Access denied. Required role: ${roles.join(' or ')}`, 403));
      }
      
      next();
    } catch (error) {
      logger.error(`Farm role check error: ${error.message}`, { error });
      next(error);
    }
  });
};

module.exports = {
  checkFarmAccess,
  isFarmOwner,
  isFarmAdmin,
  hasFarmRole
};
