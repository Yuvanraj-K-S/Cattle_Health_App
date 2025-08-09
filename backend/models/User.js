const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Authentication
  username: { 
    type: String, 
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  refreshToken: String,
  refreshTokenExpire: Date,
  
  // Profile Information
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please provide a valid phone number']
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['farm_owner'],
    default: 'farm_owner'
  },
  
  // Farm relationships
  farms: [{
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'veterinarian', 'worker', 'viewer'],
      default: 'viewer',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Default farm (for quick access)
  defaultFarm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm'
  },
  
  // Account status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  
  // Security
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpire: Date,
  emailConfirmToken: String,
  emailConfirmExpire: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update passwordChangedAt when password is modified
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000; // 1 second in the past to ensure token is created after
  next();
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '1h' }
  );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const refreshToken = crypto.randomBytes(40).toString('hex');
  this.refreshToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');
    
  this.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  return refreshToken;
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash email confirmation token
userSchema.methods.getEmailConfirmToken = function() {
  // Generate token
  const confirmToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to emailConfirmToken field
  this.emailConfirmToken = crypto
    .createHash('sha256')
    .update(confirmToken)
    .digest('hex');
    
  // Set expire (10 minutes)
  this.emailConfirmExpire = Date.now() + 10 * 60 * 1000;
  
  return confirmToken;
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  // Set expire (10 minutes)
  this.passwordResetExpire = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

// Cascade delete cattle when a user is deleted
userSchema.pre('remove', async function(next) {
  // Only delete cattle if user is the owner
  await this.model('Cattle').deleteMany({ 'owner.user': this._id, 'owner.role': 'owner' });
  next();
});

// Add an index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ 'farms.farm': 1 });

module.exports = mongoose.model('User', userSchema);
