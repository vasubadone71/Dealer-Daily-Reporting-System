const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin, requireSuperAdmin } = require('../middleware/roleMiddleware');

router.post('/', verifyToken, requireAdmin, notificationController.sendNotification);
router.get('/', verifyToken, notificationController.getNotifications);
router.delete('/:id', verifyToken, requireSuperAdmin, notificationController.deleteNotification);
router.post('/:id/resend', verifyToken, requireAdmin, notificationController.resendNotification);

module.exports = router;
