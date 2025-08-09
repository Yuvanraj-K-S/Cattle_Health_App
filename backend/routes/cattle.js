const express = require('express');
const cattleController = require('../controllers/cattle');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes below this middleware will be protected
router.use(protect);

// Routes for /api/v1/cattle
router
  .route('/')
  .get(
    authorize('super_admin', 'owner', 'manager', 'veterinarian', 'worker', 'viewer'),
    cattleController.getCattle
  )
  .post(
    authorize('super_admin', 'owner', 'manager', 'veterinarian'),
    cattleController.createCattle
  );

// Routes for /api/v1/cattle/:id
router
  .route('/:id')
  .get(
    authorize('super_admin', 'owner', 'manager', 'veterinarian', 'worker', 'viewer'),
    cattleController.getSingleCattle
  )
  .put(
    authorize('super_admin', 'owner', 'manager', 'veterinarian'),
    cattleController.updateCattle
  )
  .delete(
    authorize('super_admin', 'owner', 'manager'),
    cattleController.deleteCattle
  );

// Routes for /api/v1/cattle/:id/health
router
  .route('/:id/health')
  .get(
    authorize('super_admin', 'owner', 'manager', 'veterinarian', 'worker', 'viewer'),
    cattleController.getCattleHealthReadings
  )
  .post(
    authorize('super_admin', 'owner', 'manager', 'veterinarian'),
    cattleController.addHealthReading
  );

// Route for /api/v1/cattle/:id/health/stats
router
  .route('/:id/health/stats')
  .get(
    authorize('super_admin', 'owner', 'manager', 'veterinarian', 'worker', 'viewer'),
    cattleController.getCattleHealthStats
  );

module.exports = router;
