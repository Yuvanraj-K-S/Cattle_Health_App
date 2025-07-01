const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB with better error handling
mongoose.connect('mongodb://localhost:27017/cattleMonitor', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// Mongoose Schemas with validation
const healthReadingSchema = new mongoose.Schema({
    body_temperature: { type: Number, required: true },
    heart_rate: { type: Number, required: true },
    sleeping_duration: { type: Number, required: true },
    lying_down_duration: { type: Number, required: true },
    recorded_at: { type: Date, default: Date.now }
});

const cattleSchema = new mongoose.Schema({
    tag_id: { type: String, required: true, unique: true },
    location: { type: String, required: true },
    health_readings: { 
        type: [healthReadingSchema], 
        default: [],  // Ensures it's always an array
        validate: {
            validator: function(v) {
                return Array.isArray(v);
            },
            message: 'health_readings must be an array'
        }
    },
    created_at: { type: Date, default: Date.now }
});

const Cattle = mongoose.model('Cattle', cattleSchema);

// Helper middleware for error handling
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next))
        .catch(next);
};

// API Endpoints with improved error handling
app.post('/api/cattle', asyncHandler(async (req, res) => {
    const { tag_id, location, body_temperature, heart_rate, sleeping_duration, lying_down_duration } = req.body;
    
    // Validate required fields
    if (!tag_id || !location || body_temperature === undefined || heart_rate === undefined || 
        sleeping_duration === undefined || lying_down_duration === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newCattle = new Cattle({
        tag_id,
        location,
        health_readings: [{
            body_temperature,
            heart_rate,
            sleeping_duration,
            lying_down_duration
        }]
    });
    
    const result = await newCattle.save();
    res.status(201).json(result);
}));

app.get('/api/cattle', asyncHandler(async (req, res) => {
    const cattle = await Cattle.aggregate([
        {
            $project: {
                _id: 1,
                tag_id: 1,
                location: 1,
                avg_temp: {
                    $cond: [
                        { $and: [
                            { $isArray: "$health_readings" },
                            { $gt: [{ $size: "$health_readings" }, 0] }
                        ]},
                        { $avg: "$health_readings.body_temperature" },
                        null
                    ]
                },
                avg_heart: {
                    $cond: [
                        { $and: [
                            { $isArray: "$health_readings" },
                            { $gt: [{ $size: "$health_readings" }, 0] }
                        ]},
                        { $avg: "$health_readings.heart_rate" },
                        null
                    ]
                },
                avg_sleep: {
                    $cond: [
                        { $and: [
                            { $isArray: "$health_readings" },
                            { $gt: [{ $size: "$health_readings" }, 0] }
                        ]},
                        { $avg: "$health_readings.sleeping_duration" },
                        null
                    ]
                },
                avg_lying: {
                    $cond: [
                        { $and: [
                            { $isArray: "$health_readings" },
                            { $gt: [{ $size: "$health_readings" }, 0] }
                        ]},
                        { $avg: "$health_readings.lying_down_duration" },
                        null
                    ]
                },
                readings_count: {
                    $cond: [
                        { $isArray: "$health_readings" },
                        { $size: "$health_readings" },
                        0
                    ]
                }
            }
        }
    ]);
    
    res.json(cattle);
}));
app.get('/api/cattle/:id/readings', asyncHandler(async (req, res) => {
    const cattle = await Cattle.findById(req.params.id);
    if (!cattle) {
        return res.status(404).json({ error: 'Cattle not found' });
    }
    res.json(cattle.health_readings);
}));

app.post('/api/cattle/:id/readings', asyncHandler(async (req, res) => {
    const { body_temperature, heart_rate, sleeping_duration, lying_down_duration } = req.body;
    
    // Validate required fields
    if (body_temperature === undefined || heart_rate === undefined || 
        sleeping_duration === undefined || lying_down_duration === undefined) {
        return res.status(400).json({ error: 'Missing required health reading fields' });
    }

    const updated = await Cattle.findByIdAndUpdate(
        req.params.id,
        {
            $push: {
                health_readings: {
                    body_temperature,
                    heart_rate,
                    sleeping_duration,
                    lying_down_duration
                }
            }
        },
        { new: true }
    );
    
    if (!updated) {
        return res.status(404).json({ error: 'Cattle not found' });
    }
    
    res.json(updated);
}));

app.delete('/api/cattle/:id', asyncHandler(async (req, res) => {
    const result = await Cattle.findByIdAndDelete(req.params.id);
    if (!result) {
        return res.status(404).json({ error: 'Cattle not found' });
    }
    res.json({ message: 'Cattle deleted successfully' });
}));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));