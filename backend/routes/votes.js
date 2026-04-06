
// routes/votes.js
const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const { verifyToken, isVoter, isAdmin, isAdminOnly } = require('../middleware/auth');

router.post('/cast', verifyToken, isVoter, voteController.castVote);
router.post('/status', verifyToken, isVoter, voteController.getVoterStatus);
router.post('/candidates', verifyToken, isVoter, voteController.getCandidatesForVoter);
router.post('/results', verifyToken, isAdmin, voteController.getElectionResults);
router.post('/verify', verifyToken, isAdmin, voteController.verifyVoteOnBlockchain);
router.post('/ward-stats', verifyToken, isAdmin, voteController.getWardStatistics);
router.post('/results-admin', verifyToken, isAdminOnly, voteController.getElectionResultsForAdmin);

module.exports = router;