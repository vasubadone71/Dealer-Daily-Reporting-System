const express = require('express');
const router = express.Router();
const reportingController = require('../controllers/reportingController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.use(verifyToken);
router.use(requireAdmin); // Only network managers/admins can view these reports

router.get('/live-stock', reportingController.getLiveStock);
router.get('/ledger', reportingController.getStockMovementLedger);
router.get('/model-wise', reportingController.getModelWiseReport);
router.get('/color-wise', reportingController.getColorWiseReport);
router.get('/dispatch-history', reportingController.getDispatchHistory);
router.get('/retail-history', reportingController.getRetailHistory);
router.get('/monthly-summary', reportingController.getMonthlySummary);
router.get('/network-summary', reportingController.getNetworkSummary);

module.exports = router;
