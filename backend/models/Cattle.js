const mongoose = require('mongoose');

const cattleSchema = new mongoose.Schema({
  // Basic Information
  tagId: {
    type: String,
    required: [true, 'Please provide a tag ID'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{6,15}$/, 'Please provide a valid tag ID (6-15 alphanumeric characters)']
  },
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  
  // Classification
  species: {
    type: String,
    enum: ['cow', 'buffalo', 'goat', 'sheep', 'other'],
    required: [true, 'Please specify the species']
  },
  breed: {
    type: String,
    trim: true,
    maxlength: [50, 'Breed cannot exceed 50 characters']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Please specify the gender']
  },
  dateOfBirth: {
    type: Date
  },
  
  // Physical Attributes
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg'
    },
    lastUpdated: Date
  },
  height: {
    value: Number,
    unit: {
      type: String,
      enum: ['cm', 'inches'],
      default: 'cm'
    },
    lastUpdated: Date
  },
  color: {
    type: String,
    trim: true
  },
  
  // Health Status
  healthStatus: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
    default: 'good'
  },
  lastHealthCheck: Date,
  isPregnant: {
    type: Boolean,
    default: false
  },
  pregnancyStage: {
    type: Number, // in days
    min: 0,
    max: 290 // typical bovine gestation period
  },
  
  // Location and Grouping
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  group: {
    type: String,
    trim: true,
    maxlength: [50, 'Group name cannot exceed 50 characters']
  },
  
  // Ownership and Tenancy
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: [true, 'Cattle must belong to a farm']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Cattle must have an owner']
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'sold', 'deceased', 'transferred', 'other'],
    default: 'active'
  },
  statusNotes: {
    type: String,
    maxlength: [500, 'Status notes cannot exceed 500 characters']
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
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
cattleSchema.index({ tagId: 1 }, { unique: true });
cattleSchema.index({ farm: 1, status: 1 });
cattleSchema.index({ farm: 1, location: 1 });

// Virtual for age
cattleSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const birthDate = new Date(this.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for health readings
cattleSchema.virtual('healthReadings', {
  ref: 'HealthReading',
  localField: '_id',
  foreignField: 'cattle'
});

// Query middleware to exclude soft-deleted cattle
cattleSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Update the updatedAt timestamp on save
cattleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Cascade delete health readings when cattle is deleted
cattleSchema.pre('remove', async function(next) {
  await this.model('HealthReading').deleteMany({ cattle: this._id });
  next();
});

// Method to get the latest health reading
cattleSchema.methods.getLatestHealthReading = async function() {
  return await this.model('HealthReading')
    .findOne({ cattle: this._id })
    .sort({ recordedAt: -1 })
    .limit(1);
};

// Method to check if cattle needs health check
cattleSchema.methods.needsHealthCheck = function() {
  if (!this.lastHealthCheck) return true;
  
  const daysSinceLastCheck = 
    (new Date() - new Date(this.lastHealthCheck)) / (1000 * 60 * 60 * 24);
    
  return daysSinceLastCheck > 7; // Check every 7 days
};

module.exports = mongoose.model('Cattle', cattleSchema);
