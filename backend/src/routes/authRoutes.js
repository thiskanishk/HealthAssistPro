
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Existing routes like /register, /login...

router.post('/refresh-token', authController.refreshToken);

module.exports = router;


router.post('/admin/send-otp', authController.sendAdminOtp);
router.post('/admin/verify-otp', authController.verifyAdminOtp);
