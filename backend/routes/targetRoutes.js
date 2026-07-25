const express = require('express');
const router = express.Router();
const targetController = require('../controllers/targetController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/roleMiddleware');

router.use(verifyToken);

// Dealers and Admins can get targets
router.get('/', targetController.getTargets);

// Only Super Admins can set targets
router.post('/', requireSuperAdmin, targetController.saveTarget);
router.post('/bulk-import', requireSuperAdmin, targetController.bulkImport);
router.delete('/', requireSuperAdmin, targetController.deleteTarget);

module.exports = router;
