const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getFarms,
  getFarm,
  createFarm,
  updateFarm,
  deleteFarm,
  getFarmMembers,
  addFarmMember,
  updateFarmMember,
  removeFarmMember
} = require('../controllers/farms');

// All routes are protected and require authentication
router.use(protect);

// Base route for farm operations
router
  .route('/')
  .get(authorize('super_admin', 'owner', 'manager', 'veterinarian', 'worker', 'viewer'), getFarms) // Get all farms for the current user
  .post(authorize('super_admin', 'owner'), createFarm); // Create a new farm

// Routes for a specific farm
router
  .route('/:farmId')
  .get(authorize('super_admin', 'owner', 'manager', 'veterinarian', 'worker', 'viewer'), getFarm) // Get farm details
  .put(authorize('super_admin', 'owner', 'manager'), updateFarm) // Update farm details
  .delete(authorize('super_admin', 'owner'), deleteFarm); // Delete a farm

// Farm members management
router
  .route('/:farmId/members')
  .get(authorize('super_admin', 'owner', 'manager'), getFarmMembers) // Get all farm members
  .post(authorize('super_admin', 'owner', 'manager'), addFarmMember); // Add a member to the farm

router
  .route('/:farmId/members/:userId')
  .put(authorize('super_admin', 'owner', 'manager'), updateFarmMember) // Update farm member role
  .delete(authorize('super_admin', 'owner'), removeFarmMember); // Remove member from farm

module.exports = router;
