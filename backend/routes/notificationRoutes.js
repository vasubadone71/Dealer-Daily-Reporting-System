const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.post('/', verifyToken, requireAdmin, notificationController.sendNotification);
router.get('/', verifyToken, notificationController.getNotifications);

module.exports = router;
