const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const { setTenantContext, bypassTenant } = require('../middleware/tenantContext');
const {
  getTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantUsers,
  addTenantUser
} = require('../controllers/tenants');

// Include other resource routers
const userRouter = require('./users');

// Re-route into other resource routers
router.use('/:tenantId/users', userRouter);

// Apply protect to all routes below
router.use(protect);

// Apply tenant context to all routes below
router.use(setTenantContext);

// Routes that don't require tenant context
router.get('/:id/users', bypassTenant, getTenantUsers);
router.post('/:id/users', bypassTenant, addTenantUser);

// Routes that require tenant context
router
  .route('/')
  .get(authorize('admin', 'superadmin'), getTenants)
  .post(authorize('superadmin'), createTenant);

router
  .route('/:id')
  .get(authorize('admin', 'superadmin'), getTenant)
  .put(authorize('admin', 'superadmin'), updateTenant)
  .delete(authorize('superadmin'), deleteTenant);

module.exports = router;
