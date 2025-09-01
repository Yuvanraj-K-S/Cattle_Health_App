const Cattle = require('../models/Cattle');
const AppError = require('../utils/appError');
const axios = require('axios');
const { updateUserCattleCounts } = require('../utils/cattleUtils');

// Helper function to analyze health reading using Flask API
const analyzeHealthReading = async (readingData) => {
    try {
        // Call Flask API to predict health status
        const response = await axios.post('http://localhost:5000/predict', {
            body_temperature: readingData.body_temperature,
            heart_rate: readingData.heart_rate,
            sleeping_duration: readingData.sleeping_duration,
            lying_down_duration: readingData.lying_down_duration
        });
        
        // Return true if healthy, false if at risk
        return response.data.status === 'healthy';
    } catch (error) {
        console.error('Error analyzing health reading:', error);
        // Default to healthy if there's an error with the prediction
        return true;
    }
};

// Helper to catch async errors
const catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

// Create a new cattle
exports.createCattle = catchAsync(async (req, res, next) => {
    // Get farm_id from the authenticated user
    const { farmId } = req.user;
    
    if (!farmId) {
        return next(new AppError('Farm ID is required', 400));
    }
    
    // Check if cattle with the same tag_id already exists in the same farm
    const existingCattle = await Cattle.findOne({ 
        tag_id: req.body.tag_id,
        farm_id: farmId
    });
    if (existingCattle) {
        return next(new AppError('A cattle with this tag ID already exists in your farm', 400));
    }
    
    // Ensure farm_id from request body matches the authenticated user's farm ID
    if (req.body.farm_id && req.body.farm_id !== farmId) {
        return next(new AppError('You can only create cattle for your own farm', 403));
    }
    
    // Check if initial health readings are provided
    const initialReadings = req.body.health_readings || [];
    let healthyCount = 0;
    let riskCount = 0;
    
    // Analyze initial readings if any
    if (initialReadings.length > 0) {
        for (const reading of initialReadings) {
            const isHealthy = await analyzeHealthReading(reading);
            if (isHealthy) {
                healthyCount++;
            } else {
                riskCount++;
            }
        }
    }
    
    // Determine initial health status
    const healthStatus = riskCount >= healthyCount ? 'At risk' : 'Healthy';
    
    // Create new cattle with health tracking
    const newCattle = await Cattle.create({
        ...req.body,
        farm_id: farmId,
        health_status: healthStatus,
        healthy_readings_count: healthyCount,
        risk_readings_count: riskCount
    });

    // Update user's cattle counts
    await updateUserCattleCounts(farmId);

    res.status(201).json({
        status: 'success',
        data: {
            cattle: newCattle
        }
    });
});

// Get all cattle for the farm
exports.getAllCattle = catchAsync(async (req, res, next) => {
    const { farmId } = req.user;
    
    if (!farmId) {
        return next(new AppError('Farm ID is required', 400));
    }
    
    // Ensure farmId is treated as a string in the query
    const cattle = await Cattle.find({ farm_id: String(farmId) });
    
    res.status(200).json({
        status: 'success',
        results: cattle.length,
        data: {
            cattle
        }
    });
});

// Get a single cattle
exports.getCattle = catchAsync(async (req, res, next) => {
    const { farmId } = req.user;
    
    if (!farmId) {
        return next(new AppError('Farm ID is required', 400));
    }

    const cattle = await Cattle.findOne({ 
        _id: req.params.id, 
        farm_id: String(farmId) // Ensure farmId is treated as a string
    }).lean();

    if (!cattle) {
        return next(new AppError('No cattle found with that ID or you do not have permission to view it', 404));
    }

    // Ensure each health reading has the cattle's tag_id
    if (cattle.health_readings && cattle.health_readings.length > 0) {
        cattle.health_readings = cattle.health_readings.map(reading => ({
            ...reading,
            tag_id: reading.tag_id || cattle.tag_id
        }));
    }

    res.status(200).json({
        status: 'success',
        data: {
            cattle
        }
    });
});

// Update cattle
exports.updateCattle = catchAsync(async (req, res, next) => {
    const { farmId } = req.user;
    
    if (!farmId) {
        return next(new AppError('Farm ID is required', 400));
    }
    
    // Prevent changing the farm_id
    if (req.body.farm_id) {
        delete req.body.farm_id;
    }
    
    const cattle = await Cattle.findOneAndUpdate(
        { _id: req.params.id, farm_id: String(farmId) }, // Ensure farmId is treated as a string
        req.body,
        { new: true, runValidators: true }
    );
    
    if (!cattle) {
        return next(new AppError('No cattle found with that ID or you do not have permission to update it', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            cattle
        }
    });
});

// Delete cattle
exports.deleteCattle = catchAsync(async (req, res, next) => {
    const { farmId } = req.user;
    
    if (!farmId) {
        return next(new AppError('Farm ID is required', 400));
    }
    
    const cattle = await Cattle.findOneAndDelete({ 
        _id: req.params.id, 
        farm_id: String(farmId) // Ensure farmId is treated as a string
    });
    
    if (!cattle) {
        return next(new AppError('No cattle found with that ID or you do not have permission to delete it', 404));
    }
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Add health reading to a cattle
exports.addHealthReading = catchAsync(async (req, res, next) => {
    const { farmId } = req.user;
    const { body_temperature, heart_rate, sleeping_duration, lying_down_duration } = req.body;

    if (!farmId) {
        return next(new AppError('Farm ID is required', 400));
    }

    if (!body_temperature || !heart_rate || !sleeping_duration || !lying_down_duration) {
        return next(new AppError('Please provide all required health reading fields', 400));
    }

    // First verify the cattle exists and belongs to the user's farm
    const cattle = await Cattle.findOne({ 
        _id: req.params.id, 
        farm_id: farmId 
    }).select('+tag_id');

    if (!cattle) {
        return next(new AppError('No cattle found with that ID or you do not have permission to add readings', 404));
    }

    // Analyze the new reading
    const isHealthy = await analyzeHealthReading({
        body_temperature,
        heart_rate,
        sleeping_duration,
        lying_down_duration
    });

    // Update health counts and status based on the latest reading
    if (isHealthy) {
        cattle.healthy_readings_count += 1;
        cattle.health_status = 'Healthy';
    } else {
        cattle.risk_readings_count += 1;
        cattle.health_status = 'At risk';
    }

    // Create the new health reading with the cattle's tag_id
    const newReading = {
        tag_id: cattle.tag_id,
        body_temperature,
        heart_rate,
        sleeping_duration,
        lying_down_duration,
        recorded_at: new Date(),
        is_healthy: isHealthy
    };

    // Add the reading to the cattle's health_readings array
    cattle.health_readings.push(newReading);
    cattle.last_health_check = new Date();
    
    // Save the updated cattle document
    await cattle.save();

    // Update user's cattle counts
    await updateUserCattleCounts(farmId);

    // Get the newly added reading (last one in the array)
    const addedReading = cattle.health_readings[cattle.health_readings.length - 1];
    
    // Ensure the reading has the tag_id
    const readingWithTagId = {
        tag_id: cattle.tag_id, 
        ...addedReading.toObject() // Explicitly set tag_id from cattle
    };

    res.status(200).json({
        status: 'success',
        data: {
            reading: readingWithTagId,
            cattle: {
                _id: cattle._id,
                tag_id: cattle.tag_id,
                name: cattle.name,
                health_status: cattle.health_status,
                healthy_readings_count: cattle.healthy_readings_count,
                risk_readings_count: cattle.risk_readings_count
            }
        }
    });
});

// Get health readings for a cattle
exports.getHealthReadings = catchAsync(async (req, res, next) => {
    const { farmId } = req.user;
    const { limit, sort = '-recorded_at' } = req.query;
    
    if (!farmId) {
        return next(new AppError('Farm ID is required', 400));
    }
    
    // First verify the cattle exists and belongs to the user's farm
    const cattle = await Cattle.findOne({ 
        _id: req.params.id, 
        farm_id: farmId 
    });

    if (!cattle) {
        return next(new AppError('No cattle found with that ID or you do not have permission to view its readings', 404));
    }

    // Get health readings with optional sorting and limiting
    const query = Cattle.findOne(
        { _id: req.params.id, farm_id: farmId },
        { health_readings: 1 }
    );
    
    // Apply sorting
    if (sort) {
        const sortOrder = sort.startsWith('-') ? -1 : 1;
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        query.sort({ [`health_readings.${sortField}`]: sortOrder });
    }
    
    // Apply limit if provided
    if (limit) {
        const limitNum = parseInt(limit);
        if (!isNaN(limitNum)) {
            query.slice('health_readings', limitNum);
        }
    }
    
    const result = await query.exec();
    
    if (!result) {
        return next(new AppError('Error fetching health readings', 500));
    }

    res.status(200).json({
        status: 'success',
        results: result.health_readings ? result.health_readings.length : 0,
        data: {
            readings: result.health_readings || []
        }
    });
});

// Reset cattle health status and reading counts
exports.resetCattleHealth = catchAsync(async (req, res, next) => {
    const { farmId } = req.user;
    
    if (!farmId) {
        return next(new AppError('Farm ID is required', 400));
    }
    
    // Find the cattle and verify ownership
    const cattle = await Cattle.findOne({ 
        _id: req.params.id, 
        farm_id: farmId 
    });

    if (!cattle) {
        return next(new AppError('No cattle found with that ID or you do not have permission to update it', 404));
    }

    // Reset health status and reading counts
    cattle.health_status = 'Healthy';
    cattle.healthy_readings_count = 0;
    cattle.risk_readings_count = 0;
    cattle.last_health_check = new Date();
    
    // Save the updated cattle document
    await cattle.save();

    // Update user's cattle counts
    await updateUserCattleCounts(farmId);

    res.status(200).json({
        status: 'success',
        data: {
            cattle: {
                _id: cattle._id,
                tag_id: cattle.tag_id,
                health_status: cattle.health_status,
                healthy_readings_count: cattle.healthy_readings_count,
                risk_readings_count: cattle.risk_readings_count
            }
        }
    });
});

// Get cattle statistics for the farm
exports.getCattleStats = catchAsync(async (req, res, next) => {
    const { farmId } = req.user;
    
    // First, check if any cattle exist for this farm
    const cattleCount = await Cattle.countDocuments({ farm_id: String(farmId) });
    
    if (cattleCount === 0) {
        return res.status(200).json({
            status: 'success',
            data: {
                stats: [],
                message: 'No cattle found for this farm'
            }
        });
    }
    
    const stats = await Cattle.aggregate([
        {
            $match: { farm_id: String(farmId) }
        },
        {
            $project: {
                _id: 1,
                tag_id: 1,
                location: 1,
                avg_temp: { $avg: "$health_readings.body_temperature" },
                avg_heart: { $avg: "$health_readings.heart_rate" },
                readings_count: { $size: "$health_readings" }
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            stats
        }
    });
});
