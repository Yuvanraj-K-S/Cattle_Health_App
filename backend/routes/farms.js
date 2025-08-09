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
  .get(authorize('farm_owner'), getFarms) // Get all farms for the current user
  .post(authorize('farm_owner'), createFarm); // Create a new farm

// Routes for a specific farm
router
  .route('/:farmId')
  .get(authorize('farm_owner'), getFarm) // Get farm details
  .put(authorize('farm_owner'), updateFarm) // Update farm details
  .delete(authorize('farm_owner'), deleteFarm); // Delete a farm

// Farm members management
router
  .route('/:farmId/members')
  .get(authorize('farm_owner'), getFarmMembers) // Get all farm members
  .post(authorize('farm_owner'), addFarmMember); // Add a member to the farm

router
  .route('/:farmId/members/:userId')
  .put(authorize('farm_owner'), updateFarmMember) // Update farm member role
  .delete(authorize('farm_owner'), removeFarmMember); // Remove member from farm

module.exports = router;
