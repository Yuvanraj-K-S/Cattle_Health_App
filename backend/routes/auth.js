const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  confirmEmail,
  logout,
  refreshToken
} = require('../controllers/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.get('/confirm-email', confirmEmail);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// Protected routes (require authentication)
router.use(protect);
router.get('/me', getMe);
router.put('/update-details', updateDetails);
router.put('/update-password', updatePassword);
router.post('/logout', logout);

module.exports = router;
