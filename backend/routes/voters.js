const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const { isAdmin, verifyToken, isAdminOnly } = require('../middleware/auth');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');

router.post('/all-voters', verifyToken, isAdmin, voterController.getAllVoters);
router.post('/get-voter', verifyToken,  isAdmin, voterController.getVoterById);
router.delete('/delete-voter', verifyToken, isAdmin, voterController.deleteVoter);
router.post('/voter-login', loginLimiter, voterController.voterLogin);
router.post('/voter-verify-otp', otpLimiter, voterController.verifyVoterOTP);
router.post('/all-voters-admin', verifyToken, isAdminOnly, voterController.getAllVotersForAdmin);

module.exports = router;