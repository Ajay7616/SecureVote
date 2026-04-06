const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { isAdmin, verifyToken } = require('../middleware/auth'); 

router.post("/create", issueController.createFeedbackIssue);
router.get("/all", verifyToken, isAdmin, issueController.getAllFeedbackIssues);
router.post("/status", verifyToken, isAdmin, issueController.getIssuesBySeenStatus);
router.put("/update-seen", verifyToken, isAdmin, issueController.updateIssueSeen);
router.put("/update", verifyToken, isAdmin, issueController.updateIssue);

module.exports = router;