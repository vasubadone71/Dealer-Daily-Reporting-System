const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { requireAuth, requireSuperAdmin } = require('../middleware/authMiddleware');

// Public/dealer read routes
router.get('/inventory-tree', requireAuth, masterController.getInventoryTree);
router.get('/colors', requireAuth, masterController.getColors);

// Super admin write routes
router.post('/colors', requireSuperAdmin, masterController.addColor);
router.put('/colors/:id', requireSuperAdmin, masterController.updateColor);
router.post('/variant-colors', requireSuperAdmin, masterController.assignColorToVariant);
router.delete('/variant-colors/:variant_id/:color_id', requireSuperAdmin, masterController.removeColorFromVariant);
router.put('/models/:id/focus', requireSuperAdmin, masterController.toggleModelFocus);

module.exports = router;
