const express = require('express');
const router = express.Router();
const electionController = require('../controllers/electionController');
const { isAdmin, verifyToken, isAdminOnly } = require('../middleware/auth'); // assuming you have this

router.get('/all', verifyToken, isAdmin, electionController.getAllElections);
router.get('/completed', verifyToken, isAdmin, electionController.getCompletedElectionsWithWards);
router.post('/create', verifyToken, isAdmin, electionController.createElection);
router.post('/get', verifyToken, isAdmin, electionController.getElectionById);
router.put('/update', verifyToken, isAdmin, electionController.updateElection);
router.delete('/delete', verifyToken, isAdmin, electionController.deleteElection);
router.get('/active', verifyToken, electionController.getActiveElections);
router.post('/statistics', verifyToken, isAdmin, electionController.getElectionStatistics);
router.post('/all-admin', verifyToken, isAdminOnly, electionController.getAllElectionsForAdmin);
router.post('/active-admin', verifyToken, isAdminOnly, electionController.getActiveElectionsForAdmin);
router.post('/completed-admin', verifyToken, isAdminOnly, electionController.getCompletedElectionsWithWardsForAdmin);

module.exports = router;
