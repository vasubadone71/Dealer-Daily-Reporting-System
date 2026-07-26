const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireSuperAdmin, requireSuperAdminOrGodown, requireCanDispatch } = require('../middleware/roleMiddleware');

// Admin and Dealer routes
router.use(verifyToken);

// Dealers and Admins can view dispatches
router.get('/', dispatchController.getDispatches);

// Dealers can update status (Accepted/Rejected)
router.put('/:id/status', dispatchController.updateStatus);

// Super Admin, Godown and Showroom can create dispatches
router.post('/', requireCanDispatch, dispatchController.saveDispatch);

// Super Admin Only
router.delete('/:id', requireSuperAdmin, dispatchController.deleteDispatch);
router.post('/upload', requireSuperAdmin, dispatchController.uploadExcel);
router.post('/adjustments', requireSuperAdmin, dispatchController.saveStockAdjustment);

module.exports = router;
