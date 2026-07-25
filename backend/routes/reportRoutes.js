const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin, requireDealer } = require('../middleware/roleMiddleware');

// Dealer routes
router.get('/today', verifyToken, requireDealer, reportController.getTodayReport);
router.get('/today-stock', verifyToken, requireDealer, reportController.getTodayStock);
router.post('/draft', verifyToken, requireDealer, reportController.saveDraft);
router.post('/submit', verifyToken, requireDealer, reportController.submitReport);
router.get('/history', verifyToken, requireDealer, reportController.getHistory);
router.get('/ledger', verifyToken, requireDealer, reportController.getLedger);

// Admin routes
router.get('/dashboard', verifyToken, requireAdmin, reportController.getDashboard);
router.get('/statuses', verifyToken, requireAdmin, reportController.getTodayDealerStatuses);
router.get('/analytics', verifyToken, requireAdmin, reportController.getAnalytics);
router.get('/calendar', verifyToken, requireAdmin, reportController.getCalendar);
router.post('/admin-edit', verifyToken, requireAdmin, reportController.saveDraft);
router.post('/admin-submit', verifyToken, requireAdmin, reportController.submitReport);

// Network Manager monthly report listing: GET /reports?month=YYYY-MM
router.get('/', verifyToken, requireAdmin, reportController.getNMReports);

module.exports = router;
