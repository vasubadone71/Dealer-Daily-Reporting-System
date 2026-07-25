const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login/admin', authController.adminLogin);
router.post('/verify-otp', authController.adminVerifyOtp);
router.post('/login/dealer', authController.dealerLogin);
router.post('/login/mobile', authController.mobileLogin);

module.exports = router;
