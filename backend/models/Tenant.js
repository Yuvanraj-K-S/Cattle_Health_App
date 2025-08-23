const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true,
    maxlength: [100, 'Tenant name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  
  // Contact Information
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  phone: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please provide a valid phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: {
      type: String,
      default: 'India'
    },
    postalCode: String
  },
  
  // Subscription & Billing
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'trial', 'expired', 'cancelled'],
    default: 'trial'
  },
  subscriptionStartDate: {
    type: Date,
    default: Date.now
  },
  subscriptionEndDate: {
    type: Date
  },
  
  // Configuration
  settings: {
    maxUsers: {
      type: Number,
      default: 1
    },
    maxCattle: {
      type: Number,
      default: 10
    },
    features: {
      advancedAnalytics: { type: Boolean, default: false },
      customReports: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false }
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ 'contactEmail': 1 });
tenantSchema.index({ 'subscriptionStatus': 1 });

// Virtual for member count
tenantSchema.virtual('memberCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'tenantId',
  count: true
});

// Virtual for cattle count
tenantSchema.virtual('cattleCount', {
  ref: 'Cattle',
  localField: '_id',
  foreignField: 'tenantId',
  count: true
});

// Update updatedAt timestamp on save
tenantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Cascade delete related data when tenant is removed
tenantSchema.pre('remove', async function(next) {
  // Delete all users in this tenant
  await this.model('User').deleteMany({ tenantId: this._id });
  
  // Delete all cattle in this tenant
  await this.model('Cattle').deleteMany({ tenantId: this._id });
  
  // Delete all health records in this tenant
  await this.model('HealthRecord').deleteMany({ tenantId: this._id });
  
  next();
});

// Static method to get tenant by slug
tenantSchema.statics.findBySlug = async function(slug) {
  return await this.findOne({ slug }).select('+subscriptionStatus +subscriptionEndDate');
};

// Check if tenant has reached user limit
tenantSchema.methods.hasReachedUserLimit = async function() {
  await this.populate('memberCount');
  return this.memberCount >= this.settings.maxUsers;
};

// Check if tenant has reached cattle limit
tenantSchema.methods.hasReachedCattleLimit = async function() {
  await this.populate('cattleCount');
  return this.cattleCount >= this.settings.maxCattle;
};

// Check if tenant has active subscription
tenantSchema.methods.hasActiveSubscription = function() {
  return (
    this.subscriptionStatus === 'active' || 
    (this.subscriptionStatus === 'trial' && new Date() < this.subscriptionEndDate)
  );
};

module.exports = mongoose.model('Tenant', tenantSchema);
