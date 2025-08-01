const Farm = require('../models/Farm');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all farms for the current user
// @route   GET /api/v1/farms
// @access  Private
exports.getFarms = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: 'farms.farm',
    select: 'name description subscription.plan subscription.status cattleCount userCount',
    populate: {
      path: 'owner',
      select: 'firstName lastName email'
    }
  });

  const farms = user.farms.map(farmData => ({
    ...farmData.farm._doc,
    userRole: farmData.role
  }));

  res.status(200).json({
    success: true,
    count: farms.length,
    data: farms
  });
});

// @desc    Get single farm
// @route   GET /api/v1/farms/:farmId
// @access  Private
exports.getFarm = asyncHandler(async (req, res, next) => {
  const farm = await Farm.findById(req.params.farmId)
    .populate('owner', 'firstName lastName email')
    .populate('members.user', 'firstName lastName email role');

  if (!farm) {
    return next(
      new ErrorResponse(`Farm not found with id of ${req.params.farmId}`, 404)
    );
  }

  // Check if user has access to this farm
  const hasAccess = req.user.role === 'super_admin' || 
    req.user.farms.some(f => f.farm && f.farm.toString() === farm._id.toString());

  if (!hasAccess) {
    return next(
      new ErrorResponse('Not authorized to access this farm', 403)
    );
  }

  res.status(200).json({
    success: true,
    data: farm
  });
});

// @desc    Create new farm
// @route   POST /api/v1/farms
// @access  Private
exports.createFarm = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.owner = req.user.id;
  
  // Check for existing farm with the same name for this user
  const existingFarm = await Farm.findOne({
    name: req.body.name,
    owner: req.user.id
  });

  if (existingFarm) {
    return next(
      new ErrorResponse('You already have a farm with this name', 400)
    );
  }

  // Check user's subscription plan limits
  const userFarmsCount = await Farm.countDocuments({ owner: req.user.id });
  
  // For free tier, limit to 1 farm
  if (userFarmsCount >= 1 && req.user.subscription.plan === 'free') {
    return next(
      new ErrorResponse('Free tier is limited to 1 farm. Please upgrade to create more farms.', 400)
    );
  }

  // Create farm
  const farm = await Farm.create(req.body);

  // Add farm to user's farms array
  await User.findByIdAndUpdate(
    req.user.id,
    { 
      $push: { 
        farms: { 
          farm: farm._id, 
          role: 'owner',
          addedAt: Date.now()
        } 
      } 
    }
  );

  res.status(201).json({
    success: true,
    data: farm
  });
});

// @desc    Update farm
// @route   PUT /api/v1/farms/:farmId
// @access  Private
exports.updateFarm = asyncHandler(async (req, res, next) => {
  let farm = await Farm.findById(req.params.farmId);

  if (!farm) {
    return next(
      new ErrorResponse(`Farm not found with id of ${req.params.farmId}`, 404)
    );
  }

  // Make sure user is farm owner or admin
  if (farm.owner.toString() !== req.user.id && req.user.role !== 'super_admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this farm`,
        403
      )
    );
  }

  // Prevent changing the owner through this endpoint
  if (req.body.owner) {
    delete req.body.owner;
  }

  farm = await Farm.findByIdAndUpdate(req.params.farmId, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: farm
  });
});

// @desc    Delete farm
// @route   DELETE /api/v1/farms/:farmId
// @access  Private
exports.deleteFarm = asyncHandler(async (req, res, next) => {
  const farm = await Farm.findById(req.params.farmId);

  if (!farm) {
    return next(
      new ErrorResponse(`Farm not found with id of ${req.params.farmId}`, 404)
    );
  }

  // Make sure user is farm owner or admin
  if (farm.owner.toString() !== req.user.id && req.user.role !== 'super_admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this farm`,
        403
      )
    );
  }

  // Soft delete the farm
  farm.isDeleted = true;
  farm.deletedAt = Date.now();
  await farm.save();

  // Remove farm reference from all users
  await User.updateMany(
    { 'farms.farm': farm._id },
    { $pull: { farms: { farm: farm._id } } }
  );

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get all members of a farm
// @route   GET /api/v1/farms/:farmId/members
// @access  Private
exports.getFarmMembers = asyncHandler(async (req, res, next) => {
  const farm = await Farm.findById(req.params.farmId)
    .select('members')
    .populate('members.user', 'firstName lastName email role');

  if (!farm) {
    return next(
      new ErrorResponse(`Farm not found with id of ${req.params.farmId}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    count: farm.members.length,
    data: farm.members
  });
});

// @desc    Add member to farm
// @route   POST /api/v1/farms/:farmId/members
// @access  Private
exports.addFarmMember = asyncHandler(async (req, res, next) => {
  const { email, role = 'member' } = req.body;
  
  // Validate role
  const validRoles = ['owner', 'manager', 'member', 'viewer'];
  if (!validRoles.includes(role)) {
    return next(
      new ErrorResponse(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400)
    );
  }

  // Find the farm
  const farm = await Farm.findById(req.params.farmId);
  if (!farm) {
    return next(
      new ErrorResponse(`Farm not found with id of ${req.params.farmId}`, 404)
    );
  }

  // Check if user is the farm owner or admin
  if (farm.owner.toString() !== req.user.id && req.user.role !== 'super_admin') {
    return next(
      new ErrorResponse('Only the farm owner or admin can add members', 403)
    );
  }

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return next(
      new ErrorResponse(`User with email ${email} not found`, 404)
    );
  }

  // Check if user is already a member
  const isMember = farm.members.some(member => 
    member.user.toString() === user._id.toString()
  );

  if (isMember) {
    return next(
      new ErrorResponse('User is already a member of this farm', 400)
    );
  }

  // Add user to farm members
  farm.members.push({
    user: user._id,
    role,
    addedBy: req.user.id,
    addedAt: Date.now()
  });

  await farm.save();

  // Add farm to user's farms array if not already present
  const isFarmInUserFarms = user.farms.some(f => 
    f.farm && f.farm.toString() === farm._id.toString()
  );

  if (!isFarmInUserFarms) {
    user.farms.push({
      farm: farm._id,
      role,
      addedAt: Date.now()
    });
    await user.save();
  }

  res.status(201).json({
    success: true,
    data: farm.members
  });
});

// @desc    Update farm member role
// @route   PUT /api/v1/farms/:farmId/members/:userId
// @access  Private
exports.updateFarmMember = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  
  // Validate role
  const validRoles = ['owner', 'manager', 'member', 'viewer'];
  if (!validRoles.includes(role)) {
    return next(
      new ErrorResponse(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400)
    );
  }

  // Find the farm
  const farm = await Farm.findById(req.params.farmId);
  if (!farm) {
    return next(
      new ErrorResponse(`Farm not found with id of ${req.params.farmId}`, 404)
    );
  }

  // Check if user is the farm owner or admin
  if (farm.owner.toString() !== req.user.id && req.user.role !== 'super_admin') {
    return next(
      new ErrorResponse('Only the farm owner or admin can update member roles', 403)
    );
  }

  // Find member in farm
  const memberIndex = farm.members.findIndex(
    member => member.user.toString() === req.params.userId
  );

  if (memberIndex === -1) {
    return next(
      new ErrorResponse('Member not found in this farm', 404)
    );
  }

  // Prevent changing owner's role
  if (farm.owner.toString() === req.params.userId) {
    return next(
      new ErrorResponse('Cannot change the role of the farm owner', 400)
    );
  }

  // Update member role
  farm.members[memberIndex].role = role;
  farm.members[memberIndex].updatedAt = Date.now();
  
  await farm.save();

  // Update user's farms array
  await User.updateOne(
    { 
      _id: req.params.userId,
      'farms.farm': farm._id
    },
    { 
      $set: { 'farms.$.role': role } 
    }
  );

  res.status(200).json({
    success: true,
    data: farm.members[memberIndex]
  });
});

// @desc    Remove member from farm
// @route   DELETE /api/v1/farms/:farmId/members/:userId
// @access  Private
exports.removeFarmMember = asyncHandler(async (req, res, next) => {
  // Find the farm
  const farm = await Farm.findById(req.params.farmId);
  if (!farm) {
    return next(
      new ErrorResponse(`Farm not found with id of ${req.params.farmId}`, 404)
    );
  }

  // Check if user is the farm owner or admin
  if (farm.owner.toString() !== req.user.id && req.user.role !== 'super_admin') {
    return next(
      new ErrorResponse('Only the farm owner or admin can remove members', 403)
    );
  }

  // Prevent removing the farm owner
  if (farm.owner.toString() === req.params.userId) {
    return next(
      new ErrorResponse('Cannot remove the farm owner', 400)
    );
  }

  // Remove member from farm
  farm.members = farm.members.filter(
    member => member.user.toString() !== req.params.userId
  );
  
  await farm.save();

  // Remove farm from user's farms array
  await User.updateOne(
    { _id: req.params.userId },
    { $pull: { farms: { farm: farm._id } } }
  );

  res.status(200).json({
    success: true,
    data: {}
  });
});
