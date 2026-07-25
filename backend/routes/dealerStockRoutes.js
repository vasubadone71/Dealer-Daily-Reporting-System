const express = require('express');
const router = express.Router();
const dealerStockController = require('../controllers/dealerStockController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Admin / Network Manager: overview of ALL dealers
router.get('/overview', verifyToken, requireAdmin, dealerStockController.getOverview);

// Any authenticated user: single dealer stock
// Dealers can only access their own (enforced in controller)
router.get('/:dealerId/ledger', verifyToken, dealerStockController.getDealerLedger);
router.get('/:dealerId/transactions', verifyToken, dealerStockController.getTransactions);
router.get('/:dealerId', verifyToken, dealerStockController.getDealerStock);

module.exports = router;
