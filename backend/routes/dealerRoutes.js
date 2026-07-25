const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealerController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin, requireSuperAdmin } = require('../middleware/roleMiddleware');

router.use(verifyToken);

router.get('/', requireAdmin, dealerController.getDealers);
router.get('/:id', requireAdmin, dealerController.getDealerById);
router.post('/', requireSuperAdmin, dealerController.createDealer);
router.put('/:id', requireSuperAdmin, dealerController.updateDealer);
router.delete('/:id', requireSuperAdmin, dealerController.deleteDealer);
router.post('/:id/reset-password', requireSuperAdmin, dealerController.resetPassword);
router.get('/:id/performance', dealerController.getPerformance); // Open to admin and the specific dealer

module.exports = router;
