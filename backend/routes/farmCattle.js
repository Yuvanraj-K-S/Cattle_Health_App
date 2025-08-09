const express = require('express');
const cattleController = require('../controllers/cattle');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes below this middleware will be protected
router.use(protect);

// Routes for /api/v1/farms/:farmId/cattle
router
  .route('/:farmId/cattle')
  .post(authorize('farm_owner'), cattleController.createCattle)
  .get(authorize('farm_owner'), cattleController.getCattle);

module.exports = router;
