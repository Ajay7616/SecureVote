const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, isAdmin, isSuperAdmin } = require('../middleware/auth');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');

// Login
router.post('/login', loginLimiter, authController.login);
router.post('/verify-otp', otpLimiter, authController.employeeLoginVerifyOTP);

// Users
router.post('/add', verifyToken, isSuperAdmin, authController.createUser);

// Admin management (Super Admin only)
router.post('/admin', verifyToken, isSuperAdmin, authController.createAdmin);
router.put('/admin', verifyToken, isSuperAdmin, authController.updateAdmin);
router.delete('/admin', verifyToken, isSuperAdmin, authController.deleteAdmin);
router.get('/get-admins', verifyToken, isSuperAdmin, authController.getAllAdmins);


// Change password (Admin & Super Admin)
router.post('/change-password', verifyToken, isAdmin, authController.changePassword);
router.post('/verify-change-password', otpLimiter, verifyToken, isAdmin, authController.verifyChangePasswordOTP);

module.exports = router;
