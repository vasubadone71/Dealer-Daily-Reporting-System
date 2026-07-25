const express = require('express');
const router = express.Router();
const stockAdjustmentController = require('../controllers/stockAdjustmentController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.post('/', verifyToken, requireAdmin, stockAdjustmentController.createAdjustment);
router.get('/', verifyToken, requireAdmin, stockAdjustmentController.getAdjustments);
router.delete('/:id', verifyToken, requireAdmin, stockAdjustmentController.deleteAdjustment);

module.exports = router;
