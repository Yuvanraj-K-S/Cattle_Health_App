const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide a farm name'],
    trim: true,
    maxlength: [100, 'Farm name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Location Information
  address: {
    street: String,
    city: String,
    state: String,
    country: {
      type: String,
      required: [true, 'Please provide a country']
    },
    postalCode: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Contact Information
  contact: {
    phone: String,
    email: {
      type: String,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    website: String
  },
  
  // Settings
  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    units: {
      temperature: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      },
      weight: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      },
      distance: {
        type: String,
        enum: ['km', 'miles'],
        default: 'km'
      }
    },
    alertThresholds: {
      temperature: {
        min: { type: Number, default: 38 }, // in celsius
        max: { type: Number, default: 39.5 } // in celsius
      },
      heartRate: {
        min: { type: Number, default: 48 }, // bpm
        max: { type: Number, default: 84 }  // bpm
      }
    }
  },
  
  // Subscription and Billing
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'unpaid'],
      default: 'active'
    },
    currentPeriodEnd: Date,
    cattleLimit: {
      type: Number,
      default: 10 // Default limit for free tier
    },
    userLimit: {
      type: Number,
      default: 3 // Default limit for free tier
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
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

// Virtual for cattle count
farmSchema.virtual('cattleCount', {
  ref: 'Cattle',
  localField: '_id',
  foreignField: 'farm',
  count: true
});

// Virtual for user count
farmSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'farms.farm',
  count: true
});

// Query middleware to exclude soft-deleted farms
farmSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Indexes
farmSchema.index({ name: 'text', 'address.city': 'text', 'address.country': 'text' });
farmSchema.index({ 'address.coordinates': '2dsphere' });

// Cascade delete all associated cattle when a farm is deleted
farmSchema.pre('remove', async function(next) {
  await this.model('Cattle').deleteMany({ farm: this._id });
  // Remove farm reference from users
  await this.model('User').updateMany(
    { 'farms.farm': this._id },
    { $pull: { farms: { farm: this._id } } }
  );
  next();
});

module.exports = mongoose.model('Farm', farmSchema);
