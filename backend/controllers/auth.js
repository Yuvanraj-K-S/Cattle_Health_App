const User = require('../models/User');
const Farm = require('../models/Farm');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

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

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    phone,
    role: 'owner' // First user is an owner
  });

  // Create farm for the user
  const farm = await Farm.create({
    name: farmName || `${user.firstName}'s Farm`,
    address: farmAddress || {},
    owner: user._id,
    subscription: {
      plan: 'free',
      status: 'active',
      currentPeriodEnd: new Date().setFullYear(new Date().getFullYear() + 1), // 1 year free trial
      cattleLimit: 10,
      userLimit: 3
    }
  });

  // Add user to farm as owner
  user.farms.push({
    farm: farm._id,
    role: 'owner',
    addedAt: Date.now()
  });
  
  await user.save();

  // Generate confirmation token
  const confirmToken = user.getEmailConfirmToken();
  await user.save({ validateBeforeSave: false });

  // Create confirmation URL
  const confirmUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/confirmemail?token=${confirmToken}`;

  // Send confirmation email
  const message = `You are receiving this email because you registered an account with Cattle Health Monitor. Please confirm your email by making a GET request to: \n\n ${confirmUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Email Confirmation',
      message
    });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    user.emailConfirmToken = undefined;
    user.emailConfirmExpire = undefined;
    await user.save({ validateBeforeSave: false });
    
    return next(
      new ErrorResponse('Email could not be sent', 500)
    );
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
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(
      new ErrorResponse('Account is inactive. Please contact support.', 401)
    );
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    // Optionally resend verification email
    return next(
      new ErrorResponse('Please verify your email before logging in', 401)
    );
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'farms.farm',
      select: 'name subscription.plan subscription.status'
    });

  res.status(200).json({
    success: true,
    data: user
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

  sendTokenResponse(user, 200, res);
});

// @desc    Logout user / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
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
