const mongoose = require('mongoose');

const healthReadingSchema = new mongoose.Schema({
    tag_id: { 
        type: String, 
        required: [true, 'Tag ID is required'] 
    },
    body_temperature: { 
        type: Number, 
        required: [true, 'Body temperature is required'] 
    },
    heart_rate: { 
        type: Number, 
        required: [true, 'Heart rate is required'] 
    },
    sleeping_duration: { 
        type: Number, 
        required: [true, 'Sleeping duration is required'] 
    },
    lying_down_duration: { 
        type: Number, 
        required: [true, 'Lying down duration is required'] 
    },
    recorded_at: { 
        type: Date, 
        default: Date.now 
    }
});

const cattleSchema = new mongoose.Schema({
    tag_id: { 
        type: String, 
        required: [true, 'Tag ID is required'],
        unique: true 
    },
    farm_id: { 
        type: String, 
        required: [true, 'Farm ID is required'] 
    },
    location: { 
        type: String, 
        required: [true, 'Location is required'] 
    },
    health_status: {
        type: String,
        enum: ['Healthy', 'At risk'],
        default: 'Healthy'
    },
    healthy_readings_count: {
        type: Number,
        default: 0,
        min: 0
    },
    risk_readings_count: {
        type: Number,
        default: 0,
        min: 0
    },
    health_readings: { 
        type: [healthReadingSchema], 
        default: [],
        validate: {
            validator: function(v) {
                return Array.isArray(v);
            },
            message: 'health_readings must be an array'
        }
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    }
});

// Index for faster querying
cattleSchema.index({ farm_id: 1, tag_id: 1 });

// Pre-save hook to ensure farm_id is set
cattleSchema.pre('save', function(next) {
    if (!this.farm_id) {
        throw new Error('Farm ID is required');
    }
    next();
});

// Static method to get cattle by farm
cattleSchema.statics.findByFarm = function(farmId) {
    return this.find({ farm_id: farmId });
};

const Cattle = mongoose.model('Cattle', cattleSchema);

module.exports = Cattle;
