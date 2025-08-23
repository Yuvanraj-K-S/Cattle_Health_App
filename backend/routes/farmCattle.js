const express = require('express');
const cattleController = require('../controllers/cattle');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// All routes below this middleware will be protected
router.use(protect);

// Routes for /api/v1/farms/:farmId/cattle
router
  .route('/')
  .get(
    authorize('super_admin', 'owner', 'manager', 'veterinarian', 'worker', 'viewer'),
    cattleController.getFarmCattle
  )
  .post(
    authorize('super_admin', 'owner', 'manager', 'veterinarian'),
    cattleController.createCattle
  );

// Routes for /api/v1/farms/:farmId/cattle/:cattleId
router
  .route('/:cattleId')
  .get(
    authorize('super_admin', 'owner', 'manager', 'veterinarian', 'worker', 'viewer'),
    cattleController.getCattle
  )
  .put(
    authorize('super_admin', 'owner', 'manager', 'veterinarian'),
    cattleController.updateCattle
  )
  .delete(
    authorize('super_admin', 'owner', 'manager'),
    cattleController.deleteCattle
  );

// Health routes for specific cattle
router
  .route('/:cattleId/health')
  .get(
    authorize('super_admin', 'owner', 'manager', 'veterinarian', 'worker', 'viewer'),
    cattleController.getCattleHealthReadings
  )
  .post(
    authorize('super_admin', 'owner', 'manager', 'veterinarian'),
    cattleController.addHealthReading
  );

// Cattle health statistics
router.get(
  '/:cattleId/health/stats',
  authorize('super_admin', 'owner', 'manager', 'veterinarian', 'worker', 'viewer'),
  cattleController.getCattleHealthStats
);

module.exports = router;
