const mongoose = require('mongoose');

// Define the health reading schema as a subdocument
const healthReadingSchema = new mongoose.Schema({
  // Body Temperature in Celsius
  temperature: {
    type: Number,
    required: [true, 'Body temperature is required'],
    min: [30, 'Body temperature too low'],
    max: [45, 'Body temperature too high']
  },
  
  // Heart Rate in bpm
  heartRate: {
    type: Number,
    required: [true, 'Heart rate is required'],
    min: [30, 'Heart rate too low'],
    max: [120, 'Heart rate too high']
  },
  
  // Sleep Duration in hours
  sleepDuration: {
    type: Number,
    required: [true, 'Sleep duration is required'],
    min: [0, 'Sleep duration cannot be negative']
  },
  
  // Lying Duration in hours
  lyingDuration: {
    type: Number,
    required: [true, 'Lying duration is required'],
    min: [0, 'Lying duration cannot be negative']
  },
  
  // Timestamp for the reading
  recordedAt: {
    type: Date,
    default: Date.now
  }
});

// Cattle Schema
const cattleSchema = new mongoose.Schema({
  // Required Fields
  tagId: {
    type: String,
    required: [true, 'Tag ID is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  
  // Farm Reference
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: [true, 'Farm reference is required'],
    index: true
  },
  
  // Species
  species: {
    type: String,
    required: [true, 'Species is required'],
    enum: ['cow', 'buffalo', 'goat', 'sheep', 'other'],
    default: 'cow'
  },
  
  // Health Readings
  healthReadings: [healthReadingSchema],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add text index for searching
cattleSchema.index({ tagId: 'text' });

// Add compound index for unique tagId per farm
cattleSchema.index({ tagId: 1, farm: 1 }, { unique: true });

// Add index for farm and status for faster queries
cattleSchema.index({ farm: 1, status: 1 });

// Pre-save hook to ensure tagId is uppercase
cattleSchema.pre('save', function(next) {
  if (this.tagId) {
    this.tagId = this.tagId.toUpperCase();
  }
  next();
});

// Method to add a new health reading
cattleSchema.methods.addHealthReading = function(readingData) {
  this.healthReadings.push({
    temperature: readingData.temperature,
    heartRate: readingData.heartRate,
    sleepDuration: readingData.sleepDuration,
    lyingDuration: readingData.lyingDuration,
    recordedAt: readingData.recordedAt || new Date()
  });
  return this.save();
};

// Method to get the latest health reading
cattleSchema.methods.getLatestHealthReading = function() {
  if (this.healthReadings.length === 0) return null;
  return this.healthReadings[this.healthReadings.length - 1];
};

// Method to check if cattle needs health check
cattleSchema.methods.needsHealthCheck = function() {
  if (this.healthReadings.length === 0) return true;
  
  const lastCheck = new Date(this.healthReadings[this.healthReadings.length - 1].recordedAt);
  const daysSinceLastCheck = (new Date() - lastCheck) / (1000 * 60 * 60 * 24);
    
  return daysSinceLastCheck > 7; // Check every 7 days
};

// Static method to find cattle by farm
cattleSchema.statics.findByFarm = function(farmId, status = 'active') {
  return this.find({ farm: farmId, status })
    .sort({ tagId: 1 })
    .select('tagId species status healthReadings')
    .lean();
};

module.exports = mongoose.model('Cattle', cattleSchema);
