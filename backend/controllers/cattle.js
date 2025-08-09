const mongoose = require('mongoose');
const Cattle = require('../models/Cattle');
const HealthReading = require('../models/HealthReading');
const Farm = require('../models/Farm');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const logger = require('../utils/logger');
const Notification = require('../models/Notification');
const { checkFarmAccess } = require('../middleware/farmAccess');

// @desc    Create new cattle
// @route   POST /api/v1/cattle
// @access  Private
exports.createCattle = [
  // Check farm access
  checkFarmAccess(),
  
  // Handle the cattle creation
  asyncHandler(async (req, res, next) => {
    console.log('Received cattle creation request with data:', JSON.stringify(req.body, null, 2));
    
    const { 
    tagId, 
    species,
    temperature, 
    heartRate, 
    sleepDuration, 
    lyingDuration
  } = req.body;
    // Get farmId from route params (for /api/v1/farms/:farmId/cattle) or from request body
    const farmId = req.params.farmId || req.farmId || req.body.farmId;
    const userId = req.user.id;
    
    // Enhanced validation with detailed error messages
    const missingFields = [];
    if (!tagId) missingFields.push('tagId');
    if (!species) missingFields.push('species');
    
    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
      console.error('Validation failed:', errorMessage);
      return next(new ErrorResponse(errorMessage, 400));
    }
    
    // Ensure farmId is provided
    if (!farmId) {
      return next(new ErrorResponse('Farm ID is required', 400));
    }
    
    // Check if tag ID is already taken in this farm
    const existingCattle = await Cattle.findOne({ tagId, farm: farmId, isDeleted: false });
    if (existingCattle) {
      return next(new ErrorResponse(`Tag ID ${tagId} is already in use`, 400));
    }
    
    // Prepare health reading data if health metrics are provided
    let healthReading = null;
    if (temperature !== undefined || heartRate !== undefined || sleepDuration !== undefined || lyingDuration !== undefined) {
      healthReading = {
        temperature: temperature ? parseFloat(temperature) : null,
        heartRate: heartRate ? parseFloat(heartRate) : null,
        sleepDuration: sleepDuration ? parseFloat(sleepDuration) : null,
        lyingDuration: lyingDuration ? parseFloat(lyingDuration) : null,
        recordedAt: new Date()
      };
    }
    
    // Create cattle with the prepared data
    const cattleData = {
      tagId: tagId.toUpperCase(),
      species: species || 'cow',
      farm: farmId,
      status: 'active',
      healthReadings: healthReading ? [healthReading] : []
    };
    
    // Create cattle with the prepared data
    const cattle = await Cattle.create(cattleData);
    
    // Populate cattle with related data
    await cattle.populate([
      { path: 'farm', select: 'name' },
      { path: 'addedBy', select: 'firstName lastName email' },
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'lastUpdatedBy', select: 'firstName lastName email' }
    ]);
    
    // Prepare response with cattle data (which includes health readings)
    const response = {
      success: true,
      data: cattle
    };
    
    res.status(201).json(response);
  })
];

// @desc    Get all cattle for a farm
// @route   GET /api/v1/farms/:farmId/cattle
// @access  Private (farm_owner)
exports.getCattle = [
  // Check farm access with at least viewer role
  checkFarmAccess('viewer'),
  
  // Handle the cattle retrieval
  asyncHandler(async (req, res, next) => {
    const { farmId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc', 
      search 
    } = req.query;
    
    try {
      console.time('CattleQuery_Total');
      console.log(`Fetching cattle for farm ${farmId} with params:`, {
        page, limit, sortBy, sortOrder, search
      });

      // Build the base query
      const query = { farm: farmId };

      // Add search criteria if provided
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { tagId: searchRegex },
          { species: searchRegex }
        ];
      }

      // Add status filter if provided
      if (status) {
        query.status = status;
      } else {
        query.status = 'active'; // Default to active cattle
      }

      // Execute count query
      const total = await Cattle.countDocuments(query);
      
      // Build sort object
      const sort = {};
      sort[sortBy || 'tagId'] = sortOrder === 'desc' ? -1 : 1;

      // Execute find query with pagination
      const cattle = await Cattle.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .select('tagId species status healthReadings')
        .lean();
      
      // Process each cattle to extract the latest health reading
      const cattleWithReadings = cattle.map(cow => {
        // Get the latest health reading if available
        const latestReading = cow.healthReadings && cow.healthReadings.length > 0
          ? cow.healthReadings[cow.healthReadings.length - 1]
          : null;
        
        // Extract health metrics from the latest reading
        const healthMetrics = latestReading ? {
          temperature: latestReading.temperature,
          heartRate: latestReading.heartRate,
          sleepDuration: latestReading.sleepDuration,
          lyingDuration: latestReading.lyingDuration,
          lastHealthCheck: latestReading.recordedAt
        } : {
          temperature: null,
          heartRate: null,
          sleepDuration: null,
          lyingDuration: null,
          lastHealthCheck: null
        };
        
        // Return the cattle data with health metrics
        return {
          _id: cow._id,
          tagId: cow.tagId,
          species: cow.species,
          status: cow.status,
          ...healthMetrics,
          lastUpdated: cow.updatedAt
        };
      });
      
      // Prepare response with pagination metadata
      const pagination = {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      };

      res.status(200).json({
        success: true,
        count: cattleWithReadings.length,
        pagination,
        data: cattleWithReadings
      });
      console.log(`Fetched ${cattle.length} of ${total} total cattle records`);
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;
      
      // Log the cattle data before sending response
      console.log('Processed cattle data:', JSON.stringify(cattle, null, 2));
      
      // Format response
      const response = {
        success: true,
        count: cattle.length,
        pagination: {
          total,
          page: parseInt(page, 10),
          totalPages,
          limit: parseInt(limit, 10),
          hasNextPage,
          hasPreviousPage,
          nextPage: hasNextPage ? parseInt(page, 10) + 1 : null,
          prevPage: hasPreviousPage ? parseInt(page, 10) - 1 : null
        },
        data: cattle
      };
      
      // Log the final response
      console.log('Sending response with cattle data');
      console.log(`Response count: ${response.count}, Data length: ${response.data.length}`);
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching cattle:', error);
      next(new ErrorResponse('Failed to fetch cattle: ' + error.message, 500));
    }
  })
];

// @desc    Update cattle
// @route   PUT /api/v1/cattle/:id
// @access  Private
exports.updateCattle = [
  // First get the cattle to check the farm
  asyncHandler(async (req, res, next) => {
    // Implementation of updateCattle...
  })
];

// @desc    Get single cattle
// @route   GET /api/v1/cattle/:id
// @access  Private
exports.getSingleCattle = [
  // First get the cattle to check the farm
  asyncHandler(async (req, res, next) => {
    // Implementation of getSingleCattle...
  })
];

// @desc    Get health readings for a cattle
// @route   GET /api/v1/cattle/:id/health
// @access  Private
exports.getCattleHealthReadings = asyncHandler(async (req, res, next) => {
  // Implementation of getCattleHealthReadings...
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
    
    // Extract health metrics from request body
    const { temperature, heartRate, sleepDuration, lyingDuration } = req.body;
    
    // Validate that at least one health metric is provided
    if (temperature === undefined && 
        heartRate === undefined && 
        sleepDuration === undefined && 
        lyingDuration === undefined) {
      return next(new ErrorResponse('At least one health metric is required', 400));
    }
    
    // Create health reading object with provided metrics
    const healthReading = {
      temperature: temperature !== undefined ? parseFloat(temperature) : null,
      heartRate: heartRate !== undefined ? parseFloat(heartRate) : null,
      sleepDuration: sleepDuration !== undefined ? parseFloat(sleepDuration) : null,
      lyingDuration: lyingDuration !== undefined ? parseFloat(lyingDuration) : null,
      recordedAt: new Date()
    };
    
    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Add health reading to cattle's healthReadings array
      const updatedCattle = await Cattle.findByIdAndUpdate(
        cattle._id,
        { 
          $push: { healthReadings: healthReading },
          $set: { updatedAt: new Date() }
        },
        { session, new: true }
      );

      // 2. Check for health alerts
      const alerts = [];
      
      // Check temperature alert (normal range: 37.5-39.5°C for cattle)
      if (healthReading.temperature !== null) {
        if (healthReading.temperature > 39.5) {
          alerts.push({
            type: 'high_temperature',
            message: `High temperature (${healthReading.temperature}°C) detected for cattle ${cattle.tagId}`,
            severity: 'high',
            cattle: cattle._id,
            farm: cattle.farm,
            createdBy: userId
          });
        } else if (healthReading.temperature < 37.5) {
          alerts.push({
            type: 'low_temperature',
            message: `Low temperature (${healthReading.temperature}°C) detected for cattle ${cattle.tagId}`,
            severity: 'high',
            cattle: cattle._id,
            farm: cattle.farm,
            createdBy: userId
          });
        }
      }

      // Check heart rate alert (normal range: 48-84 bpm for adult cattle)
      if (healthReading.heartRate !== null) {
        if (healthReading.heartRate > 90) {
          alerts.push({
            type: 'high_heart_rate',
            message: `High heart rate (${healthReading.heartRate} bpm) detected for cattle ${cattle.tagId}`,
            severity: 'medium',
            cattle: cattle._id,
            farm: cattle.farm,
            createdBy: userId
          });
        } else if (healthReading.heartRate < 40) {
          alerts.push({
            type: 'low_heart_rate',
            message: `Low heart rate (${healthReading.heartRate} bpm) detected for cattle ${cattle.tagId}`,
            severity: 'medium',
            cattle: cattle._id,
            farm: cattle.farm,
            createdBy: userId
          });
        }
      }

      // Create notifications for any alerts
      if (alerts.length > 0) {
        await Notification.insertMany(alerts, { session });
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Get the updated cattle with the new health reading
      const fetchedCattle = await Cattle.findById(cattle._id)
        .select('tagId species status healthReadings')
        .lean();

      // Get the latest health reading
      const latestReading = fetchedCattle.healthReadings.length > 0
        ? fetchedCattle.healthReadings[fetchedCattle.healthReadings.length - 1]
        : null;

      res.status(201).json({
        success: true,
        data: {
          _id: updatedCattle._id,
          tagId: updatedCattle.tagId,
          species: updatedCattle.species,
          status: updatedCattle.status,
          latestHealthReading: latestReading
        }
      });
      // Emit real-time update
      if (req.app.get('io')) {
        req.app.get('io').to(`farm_${cattle.farm}`).emit('health_reading_added', {
          cattleId: cattle._id,
          reading: healthReading,
          updatedFields: {
            temperature: healthReading.temperature,
            heartRate: healthReading.heartRate,
            sleepDuration: healthReading.sleepDuration,
            lyingDuration: healthReading.lyingDuration,
            recordedAt: healthReading.recordedAt
          }
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
  
  // Check access with at least manager role
  checkFarmAccess('manager'),
  
  // Handle the cattle deletion
  asyncHandler(async (req, res, next) => {
    const { cattle } = req;
    const userId = req.user.id;
    
    // Start a transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 1. Soft delete the cattle
      cattle.isDeleted = true;
      cattle.deletedAt = new Date();
      cattle.deletedBy = userId;
      await cattle.save({ session });
      
      // 2. Update related health readings to mark them as inactive
      await HealthReading.updateMany(
        { cattle: cattle._id, isActive: true },
        { 
          $set: { 
            isActive: false,
            updatedAt: new Date(),
            updatedBy: userId
          } 
        },
        { session }
      );
      
      // 3. Update farm's cattle count
      await Farm.findByIdAndUpdate(
        cattle.farm,
        { $inc: { cattleCount: -1 } },
        { session }
      );
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      // Log the successful deletion
      logger.info('Cattle soft deleted successfully', {
        cattleId: cattle._id,
        farmId: cattle.farm,
        deletedBy: userId,
        timestamp: new Date()
      });
      
      res.status(200).json({
        success: true,
        data: {}
      });
      
    } catch (error) {
      // Abort the transaction on error
      await session.abortTransaction();
      session.endSession();
      
      logger.error('Error deleting cattle', {
        error: error.message,
        stack: error.stack,
        cattleId: cattle._id,
        farmId: cattle.farm,
        userId
      });
      
      next(new ErrorResponse('Failed to delete cattle', 500));
    }
  })
];

// @desc    Get cattle health statistics
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
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '60d':
        startDate.setMonth(now.getMonth() - 2);
        break;
      case '90d':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0); // Unix epoch
        break;
      default:
        return next(new ErrorResponse('Invalid period specified', 400));
    }
    
    try {
      // Get health readings for the specified period
      const healthReadings = await HealthReading.find({
        cattle: cattle._id,
        date: { $gte: startDate, $lte: now },
        isActive: true
      })
      .sort({ date: 1 })
      .lean();
      
      if (healthReadings.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            period,
            startDate,
            endDate: now,
            metrics: {},
            alerts: [],
            recommendations: []
          }
        });
      }
      
      // Initialize metrics object to store aggregated data
      const metrics = {
        temperature: { values: [], dates: [] },
        heartRate: { values: [], dates: [] },
        respiratoryRate: { values: [], dates: [] },
        weight: { values: [], dates: [] },
        bodyCondition: { values: [], dates: [] }
      };
      
      const alerts = [];
      const recommendations = [];
      
      // Process each health reading
      healthReadings.forEach(reading => {
        const date = reading.date.toISOString().split('T')[0]; // Just the date part
        
        // Track metrics by type
        if (reading.temperature !== undefined) {
          metrics.temperature.values.push(reading.temperature);
          metrics.temperature.dates.push(date);
          
          // Check for abnormal temperature
          if (reading.temperature > 39.5) {
            alerts.push({
              type: 'high_temperature',
              severity: 'critical',
              date: reading.date,
              value: reading.temperature,
              unit: '°C',
              message: 'High fever detected',
              readingId: reading._id
            });
            
            recommendations.push({
              type: 'veterinary_attention',
              priority: 'high',
              message: 'Immediate veterinary attention required for high fever',
              action: 'Contact a veterinarian immediately',
              readingId: reading._id
            });
          } else if (reading.temperature < 37.5) {
            alerts.push({
              type: 'low_temperature',
              severity: 'warning',
              date: reading.date,
              value: reading.temperature,
              unit: '°C',
              message: 'Low body temperature detected',
              readingId: reading._id
            });
            
            recommendations.push({
              type: 'monitor',
              priority: 'medium',
              message: 'Monitor for signs of hypothermia',
              action: 'Provide warm shelter and monitor closely',
              readingId: reading._id
            });
          }
        }
        
        if (reading.heartRate !== undefined) {
          metrics.heartRate.values.push(reading.heartRate);
          metrics.heartRate.dates.push(date);
          
          // Check for abnormal heart rate
          if (reading.heartRate > 90) {
            alerts.push({
              type: 'elevated_heart_rate',
              severity: 'warning',
              date: reading.date,
              value: reading.heartRate,
              unit: 'bpm',
              message: 'Elevated heart rate detected',
              readingId: reading._id
            });
            
            recommendations.push({
              type: 'monitor',
              priority: 'medium',
              message: 'Monitor for signs of distress or illness',
              action: 'Check for signs of pain, stress, or dehydration',
              readingId: reading._id
            });
          }
        }
        
        if (reading.respiratoryRate !== undefined) {
          metrics.respiratoryRate.values.push(reading.respiratoryRate);
          metrics.respiratoryRate.dates.push(date);
          
          // Check for abnormal respiratory rate
          if (reading.respiratoryRate > 35) {
            alerts.push({
              type: 'elevated_respiratory_rate',
              severity: 'warning',
              date: reading.date,
              value: reading.respiratoryRate,
              unit: 'breaths/min',
              message: 'Elevated respiratory rate detected',
              readingId: reading._id
            });
            
            recommendations.push({
              type: 'monitor',
              priority: 'medium',
              message: 'Monitor for respiratory distress',
              action: 'Check for signs of respiratory infection or heat stress',
              readingId: reading._id
            });
          }
        }
        
        if (reading.weight !== undefined) {
          metrics.weight.values.push(reading.weight);
          metrics.weight.dates.push(date);
          
          // Check for significant weight changes (if we have previous data)
          if (metrics.weight.values.length > 1) {
            const prevWeight = metrics.weight.values[metrics.weight.values.length - 2];
            const weightChange = ((reading.weight - prevWeight) / prevWeight) * 100;
            
            if (Math.abs(weightChange) > 10) { // More than 10% change
              alerts.push({
                type: 'significant_weight_change',
                severity: 'warning',
                date: reading.date,
                value: reading.weight,
                change: weightChange.toFixed(1) + '%',
                unit: 'kg',
                message: `Significant weight ${weightChange > 0 ? 'gain' : 'loss'} detected`,
                readingId: reading._id
              });
              
              recommendations.push({
                type: 'diet_review',
                priority: 'medium',
                message: 'Review diet and feeding practices',
                action: 'Ensure proper nutrition and feeding schedule',
                readingId: reading._id
              });
            }
          }
        }
        
        if (reading.bodyConditionScore !== undefined) {
          metrics.bodyCondition.values.push(reading.bodyConditionScore);
          metrics.bodyCondition.dates.push(date);
          
          // Check for abnormal body condition
          if (reading.bodyConditionScore < 2) {
            alerts.push({
              type: 'low_body_condition',
              severity: 'warning',
              date: reading.date,
              value: reading.bodyConditionScore,
              unit: 'score (1-5)',
              message: 'Low body condition score',
              readingId: reading._id
            });
            
            recommendations.push({
              type: 'nutritional_support',
              priority: 'high',
              message: 'Nutritional support needed',
              action: 'Increase feed quantity and quality, check for parasites',
              readingId: reading._id
            });
          } else if (reading.bodyConditionScore > 4) {
            alerts.push({
              type: 'high_body_condition',
              severity: 'warning',
              date: reading.date,
              value: reading.bodyConditionScore,
              unit: 'score (1-5)',
              message: 'High body condition score',
              readingId: reading._id
            });
            
            recommendations.push({
              type: 'diet_management',
              priority: 'medium',
              message: 'Diet adjustment recommended',
              action: 'Review and adjust feeding program to prevent obesity',
              readingId: reading._id
            });
          }
        }
      });
      
      // Calculate statistics for each metric
      const calculateStats = (values) => {
        if (!values || values.length === 0) return null;
        
        const sorted = [...values].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const avg = sum / sorted.length;
        
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
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg: parseFloat(avg.toFixed(2)),
          median: parseFloat(median.toFixed(2)),
          stdDev: parseFloat(stdDev.toFixed(2)),
          latest: values[values.length - 1]
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
      
      // Sort alerts by severity and date (most recent first)
      alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return new Date(b.date) - new Date(a.date);
      });
      
      // Sort recommendations by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      // Log the successful stats retrieval
      logger.info('Health stats retrieved successfully', {
        cattleId: cattle._id,
        farmId: cattle.farm,
        period,
        startDate,
        endDate: now,
        readingCount: healthReadings.length,
        alertCount: alerts.length,
        recommendationCount: recommendations.length
      });
      
      res.status(200).json({
        success: true,
        data: {
          period,
          startDate,
          endDate: now,
          metrics: stats,
          alerts,
          recommendations
        }
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
