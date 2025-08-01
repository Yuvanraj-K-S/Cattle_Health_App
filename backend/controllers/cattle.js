const Cattle = require('../models/Cattle');
const HealthReading = require('../models/HealthReading');
const Farm = require('../models/Farm');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Create new cattle
// @route   POST /api/v1/farms/:farmId/cattle
// @access  Private
exports.createCattle = asyncHandler(async (req, res, next) => {
  // Add farm to body
  req.body.farm = req.params.farmId;
  
  // Add user to body
  req.body.addedBy = req.user.id;

  // Check if farm exists and user has access
  const farm = await Farm.findById(req.params.farmId);
  
  if (!farm) {
    return next(
      new ErrorResponse(`Farm not found with id of ${req.params.farmId}`, 404)
    );
  }

  // Check if user has access to this farm
  const hasAccess = req.user.role === 'super_admin' || 
    req.user.farms.some(f => f.farm && f.farm.toString() === farm._id.toString());
    
  if (!hasAccess) {
    return next(
      new ErrorResponse('Not authorized to add cattle to this farm', 403)
    );
  }

  // Check if tagId already exists in the farm
  const existingCattle = await Cattle.findOne({
    farm: req.params.farmId,
    tagId: req.body.tagId,
    isDeleted: { $ne: true }
  });

  if (existingCattle) {
    return next(
      new ErrorResponse(`Cattle with tag ID ${req.body.tagId} already exists in this farm`, 400)
    );
  }

  // Create cattle
  const cattle = await Cattle.create(req.body);

  // Update farm's cattle count
  await Farm.findByIdAndUpdate(req.params.farmId, {
    $inc: { cattleCount: 1 }
  });

  res.status(201).json({
    success: true,
    data: cattle
  });
});

// @desc    Get all cattle for a farm
// @route   GET /api/v1/farms/:farmId/cattle
// @access  Private
exports.getCattle = asyncHandler(async (req, res, next) => {
  const { farmId } = req.params;
  const { status, group, location, search, sort, fields } = req.query;
  
  // Build query object
  const queryObj = { farm: farmId, isDeleted: { $ne: true } };
  
  // Add filters to query if provided
  if (status) queryObj.status = status;
  if (group) queryObj.group = group;
  if (location) queryObj.location = location;
  
  // Search functionality
  if (search) {
    queryObj.$or = [
      { tagId: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { breed: { $regex: search, $options: 'i' } },
      { 'notes': { $regex: search, $options: 'i' } }
    ];
  }
  
  // Execute query with pagination and sorting
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const skip = (page - 1) * limit;
  
  let query = Cattle.find(queryObj)
    .populate('owner', 'firstName lastName')
    .skip(skip)
    .limit(limit);
  
  // Select fields
  if (fields) {
    const fieldsList = fields.split(',').join(' ');
    query = query.select(fieldsList);
  }
  
  // Sort
  if (sort) {
    const sortBy = sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('tagId');
  }
  
  const total = await Cattle.countDocuments(queryObj);
  const cattle = await query;
  
  // Pagination result
  const pagination = {};
  
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }
  
  res.status(200).json({
    success: true,
    count: cattle.length,
    pagination,
    data: cattle
  });
});

// @desc    Update cattle
// @route   PUT /api/v1/cattle/:id
// @access  Private
exports.updateCattle = asyncHandler(async (req, res, next) => {
  let cattle = await Cattle.findById(req.params.id);
  
  if (!cattle || cattle.isDeleted) {
    return next(
      new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check if user has access to this cattle's farm
  const hasAccess = req.user.role === 'super_admin' || 
    req.user.farms.some(f => f.farm && f.farm.toString() === cattle.farm.toString() && 
    ['owner', 'manager', 'veterinarian'].includes(f.role));
    
  if (!hasAccess) {
    return next(
      new ErrorResponse('Not authorized to update this cattle', 403)
    );
  }
  
  // Prevent changing the farm or tagId
  if (req.body.farm || req.body.tagId) {
    return next(
      new ErrorResponse('Cannot change farm or tagId of an existing cattle', 400)
    );
  }
  
  // Update cattle
  cattle = await Cattle.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: cattle
  });
});

// @desc    Get single cattle
// @route   GET /api/v1/cattle/:id
// @access  Private
exports.getCattleById = asyncHandler(async (req, res, next) => {
  const cattle = await Cattle.findById(req.params.id)
    .populate('farm', 'name')
    .populate('owner', 'firstName lastName');
    
  if (!cattle || cattle.isDeleted) {
    return next(
      new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check if user has access to this cattle's farm
  const hasAccess = req.user.role === 'super_admin' || 
    req.user.farms.some(f => f.farm && f.farm.toString() === cattle.farm.toString());
    
  if (!hasAccess) {
    return next(
      new ErrorResponse('Not authorized to access this cattle', 403)
    );
  }
  
  res.status(200).json({
    success: true,
    data: cattle
  });
});

// @desc    Get health readings for a cattle
// @route   GET /api/v1/cattle/:id/health
// @access  Private
exports.getCattleHealthReadings = asyncHandler(async (req, res, next) => {
  const cattle = await Cattle.findById(req.params.id);
  
  if (!cattle || cattle.isDeleted) {
    return next(
      new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check if user has access to this cattle's farm
  const hasAccess = req.user.role === 'super_admin' || 
    req.user.farms.some(f => f.farm && f.farm.toString() === cattle.farm.toString());
    
  if (!hasAccess) {
    return next(
      new ErrorResponse('Not authorized to access these health readings', 403)
    );
  }
  
  // Build query
  const query = HealthReading.find({ cattle: req.params.id })
    .sort('-recordedAt')
    .populate('recordedBy', 'firstName lastName');
    
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await HealthReading.countDocuments({ cattle: req.params.id });
  
  query.skip(startIndex).limit(limit);
  
  // Execute query
  const healthReadings = await query;
  
  // Pagination result
  const pagination = {};
  
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }
  
  res.status(200).json({
    success: true,
    count: healthReadings.length,
    pagination,
    data: healthReadings
  });
});

// @desc    Add health reading for a cattle
// @route   POST /api/v1/cattle/:id/health
// @access  Private
exports.addHealthReading = asyncHandler(async (req, res, next) => {
  const cattle = await Cattle.findById(req.params.id);
  
  if (!cattle || cattle.isDeleted) {
    return next(
      new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check if user has permission to add health readings
  const hasAccess = req.user.role === 'super_admin' || 
    req.user.farms.some(f => f.farm && f.farm.toString() === cattle.farm.toString() && 
    ['owner', 'manager', 'veterinarian'].includes(f.role));
    
  if (!hasAccess) {
    return next(
      new ErrorResponse('Not authorized to add health readings for this cattle', 403)
    );
  }
  
  // Add cattle and recordedBy to req.body
  req.body.cattle = req.params.id;
  req.body.recordedBy = req.user.id;
  
  // Create health reading
  const healthReading = await HealthReading.create(req.body);
  
  // Update cattle's lastHealthCheck and healthStatus
  cattle.lastHealthCheck = Date.now();
  cattle.healthStatus = req.body.healthStatus || cattle.healthStatus;
  await cattle.save();
  
  res.status(201).json({
    success: true,
    data: healthReading
  });
});

// @desc    Delete cattle
// @route   DELETE /api/v1/cattle/:id
// @access  Private
exports.deleteCattle = asyncHandler(async (req, res, next) => {
  const cattle = await Cattle.findById(req.params.id);
  
  if (!cattle || cattle.isDeleted) {
    return next(
      new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check if user has access to this cattle's farm
  const hasAccess = req.user.role === 'super_admin' || 
    req.user.farms.some(f => f.farm && f.farm.toString() === cattle.farm.toString() && 
    ['owner', 'manager'].includes(f.role));
    
  if (!hasAccess) {
    return next(
      new ErrorResponse('Not authorized to delete this cattle', 403)
    );
  }
  
  // Soft delete the cattle
  cattle.isDeleted = true;
  cattle.deletedAt = Date.now();
  await cattle.save();
  
  // Decrement farm's cattle count
  await Farm.findByIdAndUpdate(cattle.farm, {
    $inc: { cattleCount: -1 }
  });
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get health stats for a cattle
// @route   GET /api/v1/cattle/:id/health/stats
// @access  Private
exports.getCattleHealthStats = asyncHandler(async (req, res, next) => {
  const cattle = await Cattle.findById(req.params.id);
  
  if (!cattle || cattle.isDeleted) {
    return next(
      new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check if user has access to this cattle's farm
  const hasAccess = req.user.role === 'super_admin' || 
    req.user.farms.some(f => f.farm && f.farm.toString() === cattle.farm.toString());
    
  if (!hasAccess) {
    return next(
      new ErrorResponse('Not authorized to access these health stats', 403)
    );
  }
  
  // Get health stats using aggregation
  const stats = await HealthReading.aggregate([
    {
      $match: { cattle: cattle._id }
    },
    {
      $group: {
        _id: null,
        avgTemperature: { $avg: '$bodyTemperature.value' },
        avgHeartRate: { $avg: '$heartRate.value' },
        minTemperature: { $min: '$bodyTemperature.value' },
        maxTemperature: { $max: '$bodyTemperature.value' },
        minHeartRate: { $min: '$heartRate.value' },
        maxHeartRate: { $max: '$heartRate.value' },
        totalReadings: { $sum: 1 },
        lastReading: { $max: '$recordedAt' }
      }
    },
    {
      $project: {
        _id: 0,
        avgTemperature: { $round: ['$avgTemperature', 2] },
        avgHeartRate: { $round: ['$avgHeartRate', 2] },
        temperatureRange: {
          min: { $round: ['$minTemperature', 2] },
          max: { $round: ['$maxTemperature', 2] }
        },
        heartRateRange: {
          min: { $round: ['$minHeartRate', 2] },
          max: { $round: ['$maxHeartRate', 2] }
        },
        totalReadings: 1,
        lastReading: 1
      }
    }
  ]);
  
  res.status(200).json({
    success: true,
    data: stats[0] || {}
  });
});
