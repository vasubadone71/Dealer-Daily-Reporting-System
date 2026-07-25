const express = require('express');
const router = express.Router();
const networkController = require('../controllers/networkController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin, requireSuperAdmin } = require('../middleware/roleMiddleware');

router.get('/', verifyToken, requireAdmin, networkController.getNetworks);
router.post('/', verifyToken, requireSuperAdmin, networkController.createNetwork);
router.delete('/:id', verifyToken, requireSuperAdmin, networkController.deleteNetwork);

module.exports = router;
