const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin, requireSuperAdmin } = require('../middleware/roleMiddleware');

// System Settings
router.get('/', verifyToken, requireAdmin, settingsController.getSettings);
router.put('/', verifyToken, requireSuperAdmin, settingsController.updateSettings);

// Admin Account Management (Super Admin only)
router.get('/admins', verifyToken, requireAdmin, settingsController.getAdmins);
router.post('/admins', verifyToken, requireSuperAdmin, settingsController.createAdmin);
router.put('/admins/:id', verifyToken, requireSuperAdmin, settingsController.updateAdmin);
router.delete('/admins/:id', verifyToken, requireSuperAdmin, settingsController.deleteAdmin);

// Self Password Modification (Any role)
router.post('/change-password', verifyToken, settingsController.changeOwnPassword);

// Audit logs (Any Admin)
router.get('/logs', verifyToken, requireAdmin, settingsController.getActivityLogs);
router.post('/logs/log-action', verifyToken, settingsController.logClientAction);

module.exports = router;
