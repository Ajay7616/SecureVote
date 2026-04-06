const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { isAdmin, verifyToken, isAdminOnly, isVoter } = require('../middleware/auth');

router.get('/all-candidates', verifyToken, isAdmin, candidateController.getAllCandidates);
router.post('/create-candidate', verifyToken, isAdmin, candidateController.uploadSymbol, candidateController.createCandidate);
router.post('/get-candidate', verifyToken, isAdmin, candidateController.getCandidateById);
router.put('/update-candidate', verifyToken, isAdmin, candidateController.uploadSymbol, candidateController.updateCandidate);
router.delete('/delete-candidate', verifyToken, isAdmin, candidateController.deleteCandidate);
router.delete('/all-candidates-by-user', verifyToken, isAdminOnly, candidateController.getCandidatesByUser);
router.post('/candidates-by-election-and-ward', verifyToken, isVoter, candidateController.getCandidateByElectionAndWard);
router.post('/admin-candidates-by-election-and-ward', verifyToken, isAdmin, candidateController.getCandidateByElectionAndWard);
router.post('/all-candidates-admin', verifyToken, isAdminOnly, candidateController.getAllCandidatesForAdmin);
router.post('/admin-candidates-by-election-and-ward-for-admin', verifyToken, isAdminOnly, candidateController.getCandidateByElectionAndWardForAdmin);

module.exports = router;