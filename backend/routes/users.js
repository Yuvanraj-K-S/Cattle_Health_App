const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const { setTenantContext } = require('../middleware/tenantContext');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/users');

// All routes are protected and require authentication
router.use(protect);
router.use(authorize('admin', 'owner'));

// Set tenant context for all routes
router.use(setTenantContext);

// Route: /api/v1/tenants/:tenantId/users
router
  .route('/')
  .get(getUsers)
  .post(createUser);

// Route: /api/v1/tenants/:tenantId/users/:id
router
  .route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
