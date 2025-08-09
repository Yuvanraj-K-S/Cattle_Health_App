const mongoose = require('mongoose');
const User = require('../models/User');
const Farm = require('../models/Farm');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/sendEmail');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '1h';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { 
    username, 
    email, 
    password, 
    firstName, 
    lastName, 
    phone,
    farmName,
    farmAddress
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [{ email }, { username }] 
  });

  if (existingUser) {
    return next(
      new ErrorResponse('User with this email or username already exists', 400)
    );
  }

  console.log('Starting registration process...');
  console.log('Request body:', JSON.stringify({
    username,
    email: email ? '***@***' : 'undefined',
    firstName,
    lastName,
    phone: phone || 'not provided',
    farmName: farmName || 'not provided',
    farmAddress: farmAddress ? '***' : 'not provided'
  }, null, 2));

  try {
    // Create user
    console.log('Attempting to create user...');
    const userData = {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      role: 'farm_owner',
      isEmailVerified: true // Auto-verify for now
    };

    console.log('User data prepared for creation:', JSON.stringify({
      ...userData,
      password: '***',
      email: email ? '***@***' : 'undefined'
    }, null, 2));

    // Create user without transaction
    const newUser = await User.create(userData);
    console.log('User created successfully:', newUser._id);

    // If farm details provided, create a farm
    if (farmName) {
      console.log('Creating farm...');
      const farmData = {
        name: farmName,
        address: farmAddress,
        owner: newUser._id,
        users: [{
          user: newUser._id,
          role: 'owner',
          addedBy: newUser._id
        }]
      };
      console.log('Farm data prepared for creation:', JSON.stringify(farmData, null, 2));
      
      const farm = await Farm.create(farmData);
      console.log('Farm created successfully:', farm._id);

      // Add farm to user's farms array
      console.log('Adding farm to user...');
      newUser.farms.push({
        farm: farm._id,
        role: 'owner',
        addedBy: newUser._id
      });
      
      console.log('Saving user with farm reference...');
      await newUser.save();
      console.log('User updated with farm reference');
    }
    
    // Send token response
    console.log('Sending success response to client...');
    sendTokenResponse(newUser, 201, res);
  } catch (err) {
    console.error('\n===== REGISTRATION ERROR =====');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    if (err.name === 'ValidationError') {
      console.error('Validation errors:', JSON.stringify(err.errors, null, 2));
    } else if (err.code) {
      console.error('Error code:', err.code);
      console.error('Error keyPattern:', err.keyPattern);
      console.error('Error keyValue:', err.keyValue);
    }
    
    const errorMessage = `Registration failed: ${err.message}`;
    console.error('Final error to client:', errorMessage);
    return next(new ErrorResponse(errorMessage, 500));
  }
});

// @desc    Confirm Email
// @route   GET /api/v1/auth/confirmemail
// @access  Public
exports.confirmEmail = asyncHandler(async (req, res, next) => {
  // Get token and hash it
  const { token } = req.query;
  
  if (!token) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  const confirmToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Get user by confirm token
  const user = await User.findOne({
    emailConfirmToken: confirmToken,
    emailConfirmExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  // Update user
  user.isEmailVerified = true;
  user.emailConfirmToken = undefined;
  user.emailConfirmExpire = undefined;
  
  await user.save();

  // Send welcome email
  const message = `Welcome to Cattle Health Monitor! Your email has been confirmed.`;
  
  try {
    await sendEmail({
      email: user.email,
      subject: 'Welcome to Cattle Health Monitor',
      message
    });

    res.status(200).json({
      success: true,
      data: 'Email confirmed successfully. You can now log in.'
    });
  } catch (err) {
    console.error(err);
    res.status(200).json({
      success: true,
      data: 'Email confirmed successfully, but welcome email could not be sent.'
    });
  }
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password +isActive +isEmailVerified');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    // Log failed login attempt
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.lastFailedLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new ErrorResponse('Your account has been deactivated. Please contact support.', 401));
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    return next(new ErrorResponse('Please verify your email address before logging in', 401));
  }

  // Reset failed login attempts on successful login
  user.failedLoginAttempts = 0;
  user.lastLogin = Date.now();
  user.lastLoginIp = req.ip;
  user.userAgent = req.headers['user-agent'];
  
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'farms.farm',
      select: 'name subscription.plan subscription.status',
      // Ensure we get the full farm object with _id and name
      transform: (doc) => ({
        _id: doc._id,
        name: doc.name,
        subscription: doc.subscription
      })
    });

  // Ensure the farms array is properly formatted
  const formattedUser = {
    ...user.toObject(),
    farms: user.farms.map(farmRef => ({
      ...farmRef.toObject(),
      // Ensure farm is an object with _id and name
      farm: {
        _id: farmRef.farm._id,
        name: farmRef.farm.name
      }
    }))
  };

  // Return user in the format expected by the frontend
  res.status(200).json({
    success: true,
    user: formattedUser
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('No user with that email', 404));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    console.error(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  
  await user.save();

  // Send token response with the new password
  sendTokenResponse(user, 200, res);
});

// @desc    Logout user / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  // Clear refresh token from database
  await User.findByIdAndUpdate(req.user.id, {
    refreshToken: undefined,
    refreshTokenExpire: undefined
  });

  // Clear cookie
  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = async (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();
  
  // Generate refresh token
  const refreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });

  // Cookie options for refresh token
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh-token'
  };

  // Set refresh token in HTTP-only cookie
  res.cookie('refreshToken', refreshToken, cookieOptions);

  // Send response with access token
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      farms: user.farms
    }
  });
};
