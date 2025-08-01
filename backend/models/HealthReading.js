const mongoose = require('mongoose');

const healthReadingSchema = new mongoose.Schema({
  // Reference to the cattle
  cattle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cattle',
    required: [true, 'Health reading must belong to a cattle'],
    index: true
  },
  
  // Reference to the farm for tenant isolation
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: [true, 'Health reading must belong to a farm'],
    index: true
  },
  
  // Basic Vital Signs
  bodyTemperature: {
    value: {
      type: Number,
      min: [30, 'Body temperature too low'],
      max: [45, 'Body temperature too high']
    },
    unit: {
      type: String,
      enum: ['celsius', 'fahrenheit'],
      default: 'celsius'
    },
    status: {
      type: String,
      enum: ['normal', 'high', 'low', 'critical'],
      default: 'normal'
    }
  },
  
  heartRate: {
    value: {
      type: Number,
      min: [30, 'Heart rate too low'],
      max: [120, 'Heart rate too high']
    },
    unit: {
      type: String,
      default: 'bpm'
    },
    status: {
      type: String,
      enum: ['normal', 'high', 'low', 'critical'],
      default: 'normal'
    }
  },
  
  // Behavioral Metrics
  activityLevel: {
    type: Number,
    min: 0,
    max: 100,
    description: 'Activity level as a percentage'
  },
  
  feedingBehavior: {
    type: String,
    enum: ['normal', 'reduced', 'increased', 'none'],
    default: 'normal'
  },
  
  // Health Metrics
  ruminationTime: {
    value: Number,
    unit: {
      type: String,
      default: 'minutes'
    },
    status: {
      type: String,
      enum: ['normal', 'low', 'high'],
      default: 'normal'
    }
  },
  
  // Reproductive Health (for females)
  reproductiveStatus: {
    type: String,
    enum: ['open', 'bred', 'pregnant', 'dry'],
    default: 'open'
  },
  
  // Health Assessment
  healthScore: {
    type: Number,
    min: 1,
    max: 10,
    description: 'Overall health score (1-10)'
  },
  
  // Additional Notes
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    trim: true
  },
  
  // Recorded by
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please specify who recorded this reading']
  },
  
  // Timestamps
  recordedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Metadata
  source: {
    type: String,
    enum: ['manual', 'sensor', 'import', 'api'],
    default: 'manual'
  },
  
  // Soft delete flag
  isDeleted: {
    type: Boolean,
    default: false,
    select: false
  },
  deletedAt: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
healthReadingSchema.index({ cattle: 1, recordedAt: -1 });
healthReadingSchema.index({ farm: 1, recordedAt: -1 });
healthReadingSchema.index({ 'bodyTemperature.status': 1 });
healthReadingSchema.index({ 'heartRate.status': 1 });

// Pre-save hook to set status based on values
healthReadingSchema.pre('save', function(next) {
  // Set temperature status
  if (this.bodyTemperature && this.bodyTemperature.value !== undefined) {
    const temp = this.bodyTemperature.value;
    if (temp < 37.5 || temp > 39.5) {
      this.bodyTemperature.status = 'critical';
    } else if (temp < 38 || temp > 39) {
      this.bodyTemperature.status = 'high';
    } else {
      this.bodyTemperature.status = 'normal';
    }
  }
  
  // Set heart rate status
  if (this.heartRate && this.heartRate.value !== undefined) {
    const hr = this.heartRate.value;
    if (hr < 45 || hr > 100) {
      this.heartRate.status = 'critical';
    } else if (hr < 50 || hr > 90) {
      this.heartRate.status = 'high';
    } else {
      this.heartRate.status = 'normal';
    }
  }
  
  next();
});

// Static method to get health trends
healthReadingSchema.statics.getHealthTrends = async function(cattleId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        cattle: mongoose.Types.ObjectId(cattleId),
        recordedAt: { $gte: startDate },
        isDeleted: { $ne: true }
      }
    },
    {
      $project: {
        date: { $dateToString: { format: '%Y-%m-%d', date: '$recordedAt' } },
        temperature: '$bodyTemperature.value',
        heartRate: '$heartRate.value',
        activityLevel: 1
      }
    },
    {
      $group: {
        _id: '$date',
        avgTemperature: { $avg: '$temperature' },
        avgHeartRate: { $avg: '$heartRate' },
        avgActivity: { $avg: '$activityLevel' },
        readings: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

module.exports = mongoose.model('HealthReading', healthReadingSchema);
