const express = require('express');
const cattleController = require('../controllers/cattleController');

const router = express.Router();

// All routes below this middleware are protected (require authentication)

// Statistics endpoint - must be defined before any route that could match '/stats' as an ID
router.get('/stats', cattleController.getCattleStats);

// Main cattle routes
router.route('/')
  .get(cattleController.getAllCattle)
  .post(cattleController.createCattle);

// Health readings for specific cattle
router.route('/:id/readings')
  .get(cattleController.getHealthReadings)
  .post(cattleController.addHealthReading);

// Reset cattle health status
router.patch('/:id/reset-health', cattleController.resetCattleHealth);

// Individual cattle operations - must be defined last to avoid route conflicts
router.route('/:id')
  .get(cattleController.getCattle)
  .patch(cattleController.updateCattle)
  .delete(cattleController.deleteCattle);

module.exports = router;
