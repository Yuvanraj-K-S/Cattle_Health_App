const mongoose = require('mongoose');
const Cattle = require('../models/Cattle');
const HealthReading = require('../models/HealthReading');
const Farm = require('../models/Farm');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const logger = require('../utils/logger');
const { checkFarmAccess } = require('../middleware/farmAccess');

// @desc    Create new cattle
// @route   POST /api/v1/farms/:farmId/cattle
// @access  Private
exports.createCattle = [
  // Check farm access with at least worker role
  checkFarmAccess('worker'),
  
  // Handle the actual cattle creation
  asyncHandler(async (req, res, next) => {
    const { farmId } = req.params;
    const userId = req.user.id;
    
    // Log the request
    logger.info('Creating new cattle', {
      userId,
      farmId,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    // Check if tagId already exists in the farm
    const existingCattle = await Cattle.findOne({
      farm: farmId,
      tagId: req.body.tagId,
      isDeleted: { $ne: true }
    });

    if (existingCattle) {
      logger.warn('Duplicate tag ID in farm', {
        tagId: req.body.tagId,
        farmId,
        userId
      });
      
      return next(
        new ErrorResponse(`Cattle with tag ID ${req.body.tagId} already exists in this farm`, 400)
      );
    }
    
    // Prepare cattle data
    const cattleData = {
      ...req.body,
      farm: farmId,
      addedBy: userId,
      owner: {
        user: userId,
        role: req.userRole,
        addedAt: new Date()
      }
    };
    
    // Create cattle in a transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create the cattle
      const cattle = await Cattle.create([cattleData], { session });
      
      // Update farm's cattle count
      await Farm.findByIdAndUpdate(
        farmId,
        { $inc: { cattleCount: 1 } },
        { session, new: true }
      );
      
      await session.commitTransaction();
      session.endSession();
      
      logger.info('Cattle created successfully', {
        cattleId: cattle[0]._id,
        farmId,
        userId
      });
      
      res.status(201).json({
        success: true,
        data: cattle[0]
      });
      
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      logger.error('Error creating cattle', {
        error: error.message,
        stack: error.stack,
        farmId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      next(error);
    }
  })
];

// @desc    Get all cattle for a farm
// @route   GET /api/v1/farms/:farmId/cattle
// @access  Private
exports.getCattle = [
  // Check farm access with at least viewer role
  checkFarmAccess('viewer'),
  
  // Handle the cattle retrieval
  asyncHandler(async (req, res, next) => {
    const { farmId } = req.params;
    const { 
      status, 
      group, 
      location, 
      search, 
      sort = '-createdAt', 
      fields, 
      page: pageStr = '1', 
      limit: limitStr = '25',
      healthStatus,
      breed,
      gender,
      minAge,
      maxAge
    } = req.query;
    
    // Build query object with access control
    const queryObj = { 
      farm: farmId, 
      isDeleted: { $ne: true },
      // Only include cattle where the user has access
      $or: [
        { 'owner.user': req.user.id },
        { 'owner.role': { $in: ['owner', 'manager', 'veterinarian', 'worker', 'viewer'] } }
      ]
    };
    
    // Add filters to query if provided
    if (status) queryObj.status = status;
    if (group) queryObj.group = group;
    if (location) queryObj.location = location;
    if (healthStatus) queryObj.healthStatus = healthStatus;
    if (breed) queryObj.breed = { $in: Array.isArray(breed) ? breed : [breed] };
    if (gender) queryObj.gender = gender;
    
    // Add age filters if provided
    if (minAge || maxAge) {
      const date = new Date();
      const maxDate = minAge ? new Date(date.getFullYear() - minAge, date.getMonth(), date.getDate()) : null;
      const minDate = maxAge ? new Date(date.getFullYear() - maxAge - 1, date.getMonth(), date.getDate()) : null;
      
      queryObj.dateOfBirth = {};
      if (maxDate) queryObj.dateOfBirth.$lte = maxDate;
      if (minDate) queryObj.dateOfBirth.$gte = minDate;
    }
    
    // Search functionality
    if (search) {
      queryObj.$and = [
        {
          $or: [
            { tagId: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { breed: { $regex: search, $options: 'i' } },
            { 'notes': { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }
    
    // Execute query with pagination and sorting
    const page = parseInt(pageStr, 10) || 1;
    const limit = parseInt(limitStr, 10) || 25;
    const skip = (page - 1) * limit;
    
    // Create base query
    let query = Cattle.find(queryObj)
      .populate('owner.user', 'firstName lastName email')
      .populate('addedBy', 'firstName lastName email')
      .skip(skip)
      .limit(limit);
    
    // Select fields
    if (fields) {
      const fieldsList = fields.split(',').join(' ');
      query = query.select(fieldsList);
    } else {
      // Default fields to return (exclude sensitive/less used fields)
      query = query.select('-__v -isDeleted -deletedAt -deletedBy');
    }
    
    // Apply sorting
    const sortBy = sort.split(',').join(' ');
    query = query.sort(sortBy);
    
    // Execute count and query in parallel for better performance
    const [total, cattle] = await Promise.all([
      Cattle.countDocuments(queryObj),
      query.lean()
    ]);
    
    // Calculate pagination metadata
    const pages = Math.ceil(total / limit);
    const pagination = {
      total,
      page,
      limit,
      pages,
      hasNextPage: page < pages,
      hasPrevPage: page > 1
    };
    
    // Add next/prev page numbers if applicable
    if (pagination.hasNextPage) {
      pagination.nextPage = page + 1;
    }
    
    if (pagination.hasPrevPage) {
      pagination.prevPage = page - 1;
    }
    
    // Add first/last page links
    if (pages > 1) {
      pagination.firstPage = 1;
      pagination.lastPage = pages;
    }
    
    logger.info(`Retrieved ${cattle.length} cattle for farm ${farmId}`, {
      farmId,
      userId: req.user.id,
      total,
      page,
      limit,
      hasFilters: Boolean(status || group || location || search || healthStatus || breed || gender || minAge || maxAge)
    });
    
    res.status(200).json({
      success: true,
      count: cattle.length,
      pagination,
      data: cattle
    });
  })
];

// @desc    Update cattle
// @route   PUT /api/v1/cattle/:id
// @access  Private
exports.updateCattle = [
  // First get the cattle to check the farm
  asyncHandler(async (req, res, next) => {
    const cattle = await Cattle.findById(req.params.id)
      .populate('owner.user', 'firstName lastName email')
      .populate('addedBy', 'firstName lastName email');
    
    if (!cattle || cattle.isDeleted) {
      return next(
        new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Store the cattle and farm ID for the next middleware
    req.cattle = cattle;
    req.farmId = cattle.farm; // Set farmId for checkFarmAccess
    next();
  }),
  
  // Check access with at least worker role
  checkFarmAccess('worker'),
  
  // Handle the update
  asyncHandler(async (req, res, next) => {
    const { cattle } = req;
    const updateData = { ...req.body };
    const userId = req.user.id;
    
    // Log the update attempt
    logger.info('Updating cattle', {
      cattleId: cattle._id,
      farmId: cattle.farm,
      userId,
      updateData: Object.keys(updateData)
    });
    
    // Prevent changing the farm or tagId
    if (updateData.farm || updateData.tagId) {
      return next(
        new ErrorResponse('Cannot change farm or tagId of an existing cattle', 400)
      );
    }
    
    // Check ownership and permissions
    const isOwner = cattle.owner.user.toString() === userId;
    const isAdmin = req.userRole === 'owner' || req.userRole === 'manager';
    
    // Non-admin users can only update their own cattle
    if (!isAdmin && !isOwner) {
      return next(
        new ErrorResponse('Not authorized to update this cattle', 403)
      );
    }
    
    // Only admins can update certain fields
    if (!isAdmin) {
      const restrictedFields = [
        'status', 'healthStatus', 'group', 'location', 'owner', 'isPregnant',
        'lastBreedingDate', 'pregnancyStatus', 'dueDate', 'isActive'
      ];
      
      restrictedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          logger.warn(`User ${userId} attempted to update restricted field: ${field}`, {
            cattleId: cattle._id,
            farmId: cattle.farm,
            userId
          });
          delete updateData[field];
        }
      });
    }
    
    // Handle owner transfer if requested
    if (updateData.owner && updateData.owner.user) {
      // Only farm owners can transfer ownership
      if (req.userRole !== 'owner') {
        return next(
          new ErrorResponse('Only farm owners can transfer cattle ownership', 403)
        );
      }
      
      // Verify the new owner has access to the farm
      const newOwnerFarmAccess = await Farm.findOne({
        _id: cattle.farm,
        'users.user': updateData.owner.user,
        'users.isActive': true
      });
      
      if (!newOwnerFarmAccess) {
        return next(
          new ErrorResponse('New owner must have access to this farm', 400)
        );
      }
      
      // Set the new owner's role in this farm
      const newOwnerRole = newOwnerFarmAccess.users.find(
        u => u.user.toString() === updateData.owner.user.toString()
      )?.role || 'viewer';
      
      updateData.owner = {
        user: updateData.owner.user,
        role: newOwnerRole,
        updatedAt: new Date(),
        updatedBy: userId
      };
      
      logger.info('Cattle ownership transferred', {
        cattleId: cattle._id,
        fromUserId: cattle.owner.user,
        toUserId: updateData.owner.user,
        farmId: cattle.farm,
        updatedBy: userId
      });
    }
    
    // Add audit fields
    updateData.updatedAt = new Date();
    updateData.updatedBy = userId;
    
    // Update cattle
    const updatedCattle = await Cattle.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
    .populate('owner.user', 'firstName lastName email')
    .populate('addedBy', 'firstName lastName email');
    
    logger.info('Cattle updated successfully', {
      cattleId: updatedCattle._id,
      farmId: updatedCattle.farm,
      updatedBy: userId,
      changes: Object.keys(updateData)
    });
    
    res.status(200).json({
      success: true,
      data: updatedCattle
    });
  })
];

// @desc    Get single cattle with detailed information
// @route   GET /api/v1/cattle/:id
// @access  Private
exports.getSingleCattle = [
  // First get the cattle to check the farm
  asyncHandler(async (req, res, next) => {
    const cattle = await Cattle.findById(req.params.id)
      .populate('owner.user', 'firstName lastName email')
      .populate('addedBy', 'firstName lastName email')
      .populate('healthReadings', 'readingType value date notes severity status')
      .populate('treatments', 'name type dosage startDate endDate status notes')
      .populate('breedingRecords', 'sireId breedingDate expectedCalvingDate actualCalvingDate status')
      .populate('milkProductionRecords', 'date amount timeOfDay notes')
      .populate('weightRecords', 'date weight notes')
      .populate('vaccinationRecords', 'vaccineType date nextDueDate administeredBy notes')
      .lean(); // Use lean() for better performance since we don't need mongoose document methods

    if (!cattle || cattle.isDeleted) {
      return next(
        new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
      );
    }

    // Store the cattle and farm ID for the next middleware
    req.cattle = cattle;
    req.farmId = cattle.farm; // Set farmId for checkFarmAccess
    next();
  }),

  // Check access with at least viewer role
  checkFarmAccess('viewer'),

  // Handle the response
  asyncHandler(async (req, res, next) => {
    const { cattle } = req;
    const userId = req.user.id;
    const isAdmin = req.userRole === 'owner' || req.userRole === 'manager';
    const isOwner = cattle.owner.user.toString() === userId;

    // Log the access
    logger.info('Cattle record accessed', {
      cattleId: cattle._id,
      farmId: cattle.farm,
      userId,
      userRole: req.userRole,
      isOwner,
      isAdmin
    });

    // For non-admin users, filter out sensitive information
    if (!isAdmin) {
      // Regular users can only see their own cattle's full details
      if (!isOwner) {
        // For cattle not owned by the user, return limited information
        const limitedFields = [
          '_id', 'tagId', 'name', 'breed', 'gender', 'dateOfBirth', 'status',
          'photo', 'createdAt', 'healthStatus', 'location', 'group'
        ];

        const limitedCattle = {};
        limitedFields.forEach(field => {
          if (cattle[field] !== undefined) {
            limitedCattle[field] = cattle[field];
          }
        });

        return res.status(200).json({
          success: true,
          data: limitedCattle,
          accessLevel: 'limited'
        });
      }

      // For owned cattle, include all fields but still filter sensitive ones
      const sensitiveFields = [
        'purchasePrice', 'salePrice', 'insuranceDetails', 'owner',
        'healthReadings', 'treatments', 'breedingRecords', 'milkProductionRecords',
        'weightRecords', 'vaccinationRecords', 'isActive', 'deletedAt', 'deletedBy'
      ];

      const filteredCattle = { ...cattle };
      sensitiveFields.forEach(field => {
        if (filteredCattle[field] !== undefined) {
          delete filteredCattle[field];
        }
      });

      return res.status(200).json({
        success: true,
        data: filteredCattle,
        accessLevel: 'owner'
      });
    }

    // For admins, return all fields
    res.status(200).json({
      success: true,
      data: cattle,
      accessLevel: 'admin'
    });
  })
];

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
exports.addHealthReading = [
  // First get the cattle to check the farm
  asyncHandler(async (req, res, next) => {
    const cattle = await Cattle.findById(req.params.id);
    
    if (!cattle || cattle.isDeleted) {
      return next(
        new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Store the cattle and farm ID for the next middleware
    req.cattle = cattle;
    req.farmId = cattle.farm; // Set farmId for checkFarmAccess
    next();
  }),
  
  // Check access with at least worker role
  checkFarmAccess('worker'),
  
  // Handle the health reading creation
  asyncHandler(async (req, res, next) => {
    const { cattle } = req;
    const userId = req.user.id;
    const userRole = req.userRole;
    
    // Check if the cattle is active
    if (cattle.status !== 'active') {
      return next(
        new ErrorResponse('Cannot add health reading to an inactive cattle', 400)
      );
    }
    
    // Prepare health reading data
    const healthData = {
      ...req.body,
      cattle: cattle._id,
      recordedBy: userId,
      farm: cattle.farm, // Store farm reference for easier querying
      date: req.body.date || new Date()
    };
    
    // Validate required fields
    if (!healthData.readingType) {
      return next(new ErrorResponse('Reading type is required', 400));
    }
    
    // Set default values based on reading type
    switch (healthData.readingType) {
      case 'temperature':
        if (healthData.value === undefined) {
          return next(new ErrorResponse('Temperature value is required', 400));
        }
        healthData.unit = healthData.unit || '°C';
        break;
        
      case 'heart_rate':
        if (healthData.value === undefined) {
          return next(new ErrorResponse('Heart rate value is required', 400));
        }
        healthData.unit = healthData.unit || 'bpm';
        break;
        
      case 'respiratory_rate':
        if (healthData.value === undefined) {
          return next(new ErrorResponse('Respiratory rate value is required', 400));
        }
        healthData.unit = healthData.unit || 'bpm';
        break;
        
      case 'weight':
        if (healthData.value === undefined) {
          return next(new ErrorResponse('Weight value is required', 400));
        }
        healthData.unit = healthData.unit || 'kg';
        break;
        
      case 'body_condition':
        if (healthData.value === undefined) {
          return next(new ErrorResponse('Body condition score is required', 400));
        }
        // Validate body condition score (1-5 scale)
        if (healthData.value < 1 || healthData.value > 5) {
          return next(new ErrorResponse('Body condition score must be between 1 and 5', 400));
        }
        healthData.unit = healthData.unit || 'score';
        break;
        
      default:
        // For custom reading types, ensure value is provided
        if (healthData.value === undefined) {
          return next(new ErrorResponse('Reading value is required', 400));
        }
    }
    
    // Check for abnormal values and set severity
    if (healthData.value !== undefined) {
      healthData.severity = 'normal';
      healthData.status = 'normal';
      
      // Temperature check (normal range: 38-39.2°C for cattle)
      if (healthData.readingType === 'temperature') {
        if (healthData.value > 39.5) {
          healthData.severity = 'critical';
          healthData.status = 'abnormal';
          healthData.notes = (healthData.notes || '') + ' High fever detected. ';
        } else if (healthData.value < 37.5) {
          healthData.severity = 'warning';
          healthData.status = 'abnormal';
          healthData.notes = (healthData.notes || '') + ' Low temperature detected. ';
        }
      }
      
      // Heart rate check (normal range: 48-84 bpm for adult cattle)
      if (healthData.readingType === 'heart_rate' && healthData.value > 90) {
        healthData.severity = 'warning';
        healthData.status = 'abnormal';
        healthData.notes = (healthData.notes || '') + ' Elevated heart rate. ';
      }
      
      // Respiratory rate check (normal range: 10-30 breaths per minute)
      if (healthData.readingType === 'respiratory_rate' && healthData.value > 35) {
        healthData.severity = 'warning';
        healthData.status = 'abnormal';
        healthData.notes = (healthData.notes || '') + ' Elevated respiratory rate. ';
      }
      
      // Body condition score check (1-5 scale, ideal 2.5-3.5)
      if (healthData.readingType === 'body_condition') {
        if (healthData.value < 2) {
          healthData.severity = 'warning';
          healthData.notes = (healthData.notes || '') + ' Low body condition score. ';
        } else if (healthData.value > 4) {
          healthData.severity = 'warning';
          healthData.notes = (healthData.notes || '') + ' High body condition score. ';
        }
      }
    }
    
    // Start a transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 1. Create the health reading
      const healthReading = await HealthReading.create([healthData], { session });
      
      // 2. Update cattle's last health check and status if needed
      const updateData = {
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
        updatedBy: userId
      };
      
      // Update specific health metrics on the cattle record
      if (healthData.readingType === 'temperature') {
        updateData.lastTemperature = healthData.value;
        updateData.lastTemperatureDate = healthData.date;
      } else if (healthData.readingType === 'weight') {
        updateData.weight = healthData.value;
        updateData.lastWeighed = healthData.date;
      } else if (healthData.readingType === 'body_condition') {
        updateData.bodyConditionScore = healthData.value;
        updateData.bodyConditionDate = healthData.date;
      }
      
      // If critical reading, mark for attention
      if (healthData.severity === 'critical') {
        updateData.healthStatus = 'critical';
        updateData.needsAttention = true;
        updateData.lastAlertDate = new Date();
      } else if (healthData.severity === 'warning' && cattle.healthStatus !== 'critical') {
        // Only update to warning if not already critical
        updateData.healthStatus = 'warning';
        updateData.needsAttention = true;
        updateData.lastAlertDate = new Date();
      } else if (healthData.status === 'normal' && cattle.healthStatus !== 'normal') {
        // If all recent readings are normal, update status
        const abnormalReadings = await HealthReading.countDocuments({
          cattle: cattle._id,
          status: { $ne: 'normal' },
          date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });
        
        if (abnormalReadings === 0) {
          updateData.healthStatus = 'normal';
          updateData.needsAttention = false;
        }
      }
      
      await Cattle.findByIdAndUpdate(cattle._id, updateData, { session });
      
      // 3. Create notification if needed
      if (healthData.severity === 'critical' || healthData.severity === 'warning') {
        const notification = {
          type: 'health_alert',
          title: `Health ${healthData.severity} alert for ${cattle.name || 'cattle'} ${cattle.tagId}`,
          message: `${healthData.readingType.replace('_', ' ')} reading of ${healthData.value}${healthData.unit} is ${healthData.severity}${healthData.notes ? ': ' + healthData.notes.trim() : ''}`,
          severity: healthData.severity,
          cattle: cattle._id,
          farm: cattle.farm,
          createdBy: userId,
          relatedTo: {
            type: 'HealthReading',
            id: healthReading[0]._id
          }
        };
        
        await Notification.create([notification], { session });
      }
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      // Populate the created reading for response
      const populatedReading = await HealthReading.findById(healthReading[0]._id)
        .populate('recordedBy', 'firstName lastName email')
        .populate('cattle', 'tagId name')
        .lean();
      
      // Log the successful health reading
      logger.info('Health reading added successfully', {
        cattleId: cattle._id,
        farmId: cattle.farm,
        readingId: healthReading[0]._id,
        readingType: healthData.readingType,
        value: healthData.value,
        unit: healthData.unit,
        severity: healthData.severity,
        recordedBy: userId,
        userRole
      });
      
      // Emit real-time update
      if (req.app.get('io')) {
        req.app.get('io').to(`farm_${cattle.farm}`).emit('health_reading_added', {
          cattleId: cattle._id,
          reading: populatedReading,
          updatedFields: updateData
        });
      }
      
      res.status(201).json({
        success: true,
        data: populatedReading
      });
      
    } catch (error) {
      // Abort the transaction on error
      await session.abortTransaction();
      session.endSession();
      
      logger.error('Error adding health reading', {
        error: error.message,
        stack: error.stack,
        cattleId: cattle._id,
        farmId: cattle.farm,
        userId,
        healthData
      });
      
      next(new ErrorResponse('Failed to add health reading', 500));
    }
  })
];

// @desc    Delete cattle (soft delete)
// @route   DELETE /api/v1/cattle/:id
// @access  Private
exports.deleteCattle = [
  // First get the cattle to check the farm
  asyncHandler(async (req, res, next) => {
    const cattle = await Cattle.findById(req.params.id);
    
    if (!cattle) {
      return next(
        new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Already deleted
    if (cattle.isDeleted) {
      return next(
        new ErrorResponse('This cattle record has already been deleted', 410) // 410 Gone
      );
    }
    
    // Store the cattle and farm ID for the next middleware
    req.cattle = cattle;
    req.farmId = cattle.farm; // Set farmId for checkFarmAccess
    next();
  }),
  
  // Check access with at least manager role
  checkFarmAccess('manager'),
  
  // Handle the soft delete
  asyncHandler(async (req, res, next) => {
    const { cattle } = req;
    const userId = req.user.id;
    const userRole = req.userRole;
    
    // Only owners can delete cattle with active health issues or treatments
    if (userRole !== 'owner') {
      // Check for active health issues
      const hasActiveHealthIssues = await HealthReading.exists({
        cattle: cattle._id,
        status: { $in: ['critical', 'warning'] },
        resolved: false
      });
      
      // Check for active treatments
      const hasActiveTreatments = await Treatment.exists({
        cattle: cattle._id,
        status: { $nin: ['completed', 'cancelled'] }
      });
      
      if (hasActiveHealthIssues || hasActiveTreatments) {
        return next(
          new ErrorResponse(
            'Only farm owners can delete cattle with active health issues or treatments', 
            403
          )
        );
      }
    }
    
    // Start a transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 1. Soft delete the cattle
      cattle.isDeleted = true;
      cattle.deletedAt = new Date();
      cattle.deletedBy = userId;
      
      // 2. Update related records
      const now = new Date();
      const updatePromises = [
        // Mark health readings as inactive
        HealthReading.updateMany(
          { cattle: cattle._id, isActive: true },
          { 
            $set: { 
              isActive: false,
              updatedAt: now,
              updatedBy: userId
            } 
          },
          { session }
        ),
        
        // Mark treatments as cancelled
        Treatment.updateMany(
          { 
            cattle: cattle._id, 
            status: { $nin: ['completed', 'cancelled'] } 
          },
          { 
            $set: { 
              status: 'cancelled',
              updatedAt: now,
              updatedBy: userId
            } 
          },
          { session }
        ),
        
        // Mark breeding records as inactive
        BreedingRecord.updateMany(
          { 
            $or: [
              { cattle: cattle._id },
              { sire: cattle._id }
            ],
            status: { $nin: ['completed', 'cancelled'] } 
          },
          { 
            $set: { 
              status: 'cancelled',
              updatedAt: now,
              updatedBy: userId
            } 
          },
          { session }
        )
      ];
      
      // Execute all updates in parallel
      await Promise.all([
        cattle.save({ session }),
        ...updatePromises
      ]);
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      // Log the deletion
      logger.info('Cattle soft deleted', {
        cattleId: cattle._id,
        farmId: cattle.farm,
        deletedBy: userId,
        userRole,
        timestamp: new Date()
      });
      
      res.status(200).json({
        success: true,
        data: {
          id: cattle._id,
          tagId: cattle.tagId,
          name: cattle.name,
          deletedAt: cattle.deletedAt,
          deletedBy: cattle.deletedBy
        },
        message: 'Cattle record has been soft deleted successfully'
      });
      
    } catch (error) {
      // Abort the transaction on error
      await session.abortTransaction();
      session.endSession();
      
      logger.error('Error during cattle deletion', {
        error: error.message,
        stack: error.stack,
        cattleId: cattle._id,
        farmId: cattle.farm,
        userId: userId
      });
      
      next(new ErrorResponse('Failed to delete cattle record', 500));
    }
  })
];

// @desc    Get comprehensive health stats for a cattle
// @route   GET /api/v1/cattle/:id/health/stats
// @access  Private
exports.getCattleHealthStats = [
  // First get the cattle to check the farm
  asyncHandler(async (req, res, next) => {
    const cattle = await Cattle.findById(req.params.id);
    
    if (!cattle || cattle.isDeleted) {
      return next(
        new ErrorResponse(`Cattle not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Store the cattle and farm ID for the next middleware
    req.cattle = cattle;
    req.farmId = cattle.farm; // Set farmId for checkFarmAccess
    next();
  }),
  
  // Check access with at least viewer role
  checkFarmAccess('viewer'),
  
  // Handle the health stats retrieval
  asyncHandler(async (req, res, next) => {
    const { cattle } = req;
    const { period = '30d' } = req.query; // Default to 30 days, other options: 7d, 60d, 90d, 1y, all
    
    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date(now);
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '60d':
        startDate.setDate(now.getDate() - 60);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2000); // Arbitrary old date
        break;
      case '30d':
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    // Log the health stats request
    logger.info('Fetching health stats for cattle', {
      cattleId: cattle._id,
      farmId: cattle.farm,
      period,
      startDate,
      endDate: now,
      userId: req.user.id,
      userRole: req.userRole
    });
    
    try {
      // Get health readings for the specified period
      const healthReadings = await HealthReading.find({
        cattle: cattle._id,
        date: { $gte: startDate, $lte: now },
        isActive: true
      })
      .sort('date')
      .lean();
      
      // Get recent treatments
      const treatments = await Treatment.find({
        cattle: cattle._id,
        $or: [
          { startDate: { $gte: startDate } },
          { endDate: { $gte: startDate } },
          { status: { $in: ['in-progress', 'pending'] } }
        ]
      })
      .sort({ startDate: -1 })
      .limit(10)
      .lean();
      
      // Get vaccination records
      const vaccinations = await Vaccination.find({
        cattle: cattle._id,
        $or: [
          { date: { $gte: startDate } },
          { nextDueDate: { $gte: now } } // Upcoming or recent vaccinations
        ]
      })
      .sort({ date: -1 })
      .lean();
      
      // Calculate health metrics
      const metrics = {
        temperature: { values: [], dates: [] },
        heartRate: { values: [], dates: [] },
        respiratoryRate: { values: [], dates: [] },
        weight: { values: [], dates: [] },
        bodyCondition: { values: [], dates: [] }
      };
      
      // Track alerts and anomalies
      const alerts = {
        critical: [],
        warning: [],
        info: []
      };
      
      // Process health readings
      healthReadings.forEach(reading => {
        const date = reading.date.toISOString().split('T')[0]; // Just the date part
        
        // Track metrics by type
        if (reading.temperature !== undefined) {
          metrics.temperature.values.push(reading.temperature);
          metrics.temperature.dates.push(date);
          
          // Check for fever (normal range: 38-39.2°C for cattle)
          if (reading.temperature > 39.5) {
            alerts.critical.push({
              type: 'high_temperature',
              value: reading.temperature,
              date: reading.date,
              message: `High temperature: ${reading.temperature}°C`
            });
          } else if (reading.temperature < 37.5) {
            alerts.warning.push({
              type: 'low_temperature',
              value: reading.temperature,
              date: reading.date,
              message: `Low temperature: ${reading.temperature}°C`
            });
          }
        }
        
        if (reading.heartRate) {
          metrics.heartRate.values.push(reading.heartRate);
          metrics.heartRate.dates.push(date);
          
          // Check heart rate (normal range: 48-84 bpm for adult cattle)
          if (reading.heartRate > 90) {
            alerts.warning.push({
              type: 'elevated_heart_rate',
              value: reading.heartRate,
              date: reading.date,
              message: `Elevated heart rate: ${reading.heartRate} bpm`
            });
          }
        }
        
        if (reading.respiratoryRate) {
          metrics.respiratoryRate.values.push(reading.respiratoryRate);
          metrics.respiratoryRate.dates.push(date);
          
          // Check respiratory rate (normal range: 10-30 breaths per minute)
          if (reading.respiratoryRate > 35) {
            alerts.warning.push({
              type: 'elevated_respiratory_rate',
              value: reading.respiratoryRate,
              date: reading.date,
              message: `Elevated respiratory rate: ${reading.respiratoryRate} bpm`
            });
          }
        }
        
        if (reading.weight) {
          metrics.weight.values.push(reading.weight);
          metrics.weight.dates.push(date);
        }
        
        if (reading.bodyConditionScore) {
          metrics.bodyCondition.values.push(reading.bodyConditionScore);
          metrics.bodyCondition.dates.push(date);
          
          // Check body condition score (1-5 scale, ideal 2.5-3.5)
          if (reading.bodyConditionScore < 2) {
            alerts.warning.push({
              type: 'low_body_condition',
              value: reading.bodyConditionScore,
              date: reading.date,
              message: `Low body condition score: ${reading.bodyConditionScore}/5`
            });
          } else if (reading.bodyConditionScore > 4) {
            alerts.warning.push({
              type: 'high_body_condition',
              value: reading.bodyConditionScore,
              date: reading.date,
              message: `High body condition score: ${reading.bodyConditionScore}/5`
            });
          }
        }
        
        // Process any custom alerts from the reading
        if (reading.alerts && Array.isArray(reading.alerts)) {
          reading.alerts.forEach(alert => {
            if (alert.severity === 'critical') {
              alerts.critical.push({
                type: alert.type || 'custom_alert',
                value: alert.value,
                date: reading.date,
                message: alert.message || 'Critical health alert',
                details: alert.details
              });
            } else if (alert.severity === 'warning') {
              alerts.warning.push({
                type: alert.type || 'custom_alert',
                value: alert.value,
                date: reading.date,
                message: alert.message || 'Health warning',
                details: alert.details
              });
            } else {
              alerts.info.push({
                type: alert.type || 'info',
                value: alert.value,
                date: reading.date,
                message: alert.message || 'Health information',
                details: alert.details
              });
            }
          });
        }
      });
      
      // Calculate statistics for each metric
      const calculateStats = (values) => {
        if (!values || values.length === 0) return null;
        
        const sorted = [...values].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const avg = sum / sorted.length;
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        
        // Calculate median
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 
          ? sorted[mid] 
          : (sorted[mid - 1] + sorted[mid]) / 2;
        
        // Calculate standard deviation
        const squareDiffs = sorted.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / sorted.length;
        const stdDev = Math.sqrt(avgSquareDiff);
        
        return {
          count: sorted.length,
          average: parseFloat(avg.toFixed(2)),
          min: parseFloat(min.toFixed(2)),
          max: parseFloat(max.toFixed(2)),
          median: parseFloat(median.toFixed(2)),
          standardDeviation: parseFloat(stdDev.toFixed(2)),
          trend: null // Will be calculated client-side with more data points
        };
      };
      
      // Calculate stats for each metric
      const stats = {
        temperature: calculateStats(metrics.temperature.values),
        heartRate: calculateStats(metrics.heartRate.values),
        respiratoryRate: calculateStats(metrics.respiratoryRate.values),
        weight: calculateStats(metrics.weight.values),
        bodyCondition: calculateStats(metrics.bodyCondition.values)
      };
      
      // Determine overall health status
      let overallStatus = 'healthy';
      if (alerts.critical.length > 0) {
        overallStatus = 'critical';
      } else if (alerts.warning.length > 0) {
        overallStatus = 'warning';
      } else if (alerts.info.length > 0) {
        overallStatus = 'needs_attention';
      }
      
      // Prepare response
      const response = {
        period: {
          start: startDate,
          end: now,
          days: Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))
        },
        summary: {
          totalReadings: healthReadings.length,
          totalAlerts: alerts.critical.length + alerts.warning.length + alerts.info.length,
          criticalAlerts: alerts.critical.length,
          warningAlerts: alerts.warning.length,
          infoAlerts: alerts.info.length,
          overallStatus,
          lastUpdated: new Date()
        },
        metrics: stats,
        alerts,
        treatments: treatments.map(t => ({
          id: t._id,
          name: t.name,
          type: t.type,
          status: t.status,
          startDate: t.startDate,
          endDate: t.endDate,
          notes: t.notes
        })),
        vaccinations: vaccinations.map(v => ({
          id: v._id,
          vaccineType: v.vaccineType,
          date: v.date,
          nextDueDate: v.nextDueDate,
          administeredBy: v.administeredBy,
          notes: v.notes
        })),
        recommendations: []
      };
      
      // Generate recommendations based on alerts and metrics
      if (alerts.critical.length > 0) {
        response.recommendations.push({
          priority: 'high',
          message: 'Immediate veterinary attention required due to critical health alerts',
          action: 'Contact a veterinarian immediately.'
        });
      }
      
      if (alerts.warning.some(a => a.type === 'low_body_condition')) {
        response.recommendations.push({
          priority: 'medium',
          message: 'Low body condition score detected',
          action: 'Review feeding regimen and consider nutritional supplements.'
        });
      }
      
      if (alerts.warning.some(a => a.type === 'high_body_condition')) {
        response.recommendations.push({
          priority: 'low',
          message: 'High body condition score detected',
          action: 'Monitor diet and consider adjusting feed to prevent obesity.'
        });
      }
      
      // Add more recommendations based on other metrics and alerts
      
      // Log the successful stats retrieval
      logger.info('Successfully retrieved health stats', {
        cattleId: cattle._id,
        farmId: cattle.farm,
        period,
        readingCount: healthReadings.length,
        alertCount: response.summary.totalAlerts,
        status: overallStatus
      });
      
      res.status(200).json({
        success: true,
        data: response
      });
      
    } catch (error) {
      logger.error('Error retrieving health stats', {
        error: error.message,
        stack: error.stack,
        cattleId: cattle._id,
        farmId: cattle.farm,
        userId: req.user.id
      });
      
      next(new ErrorResponse('Failed to retrieve health statistics', 500));
    }
  })
];
