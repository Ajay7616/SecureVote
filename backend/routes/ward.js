const express = require('express');
const router = express.Router();
const multer = require('multer');
const wardController = require('../controllers/wardController');
const { isAdmin, verifyToken } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  }
});

router.get('/all-ward', verifyToken, isAdmin, wardController.getAllWards);
router.post('/create-ward', verifyToken, isAdmin, wardController.createWard);
router.post('/get-ward', verifyToken, isAdmin, wardController.getWardById);
router.put('/update-ward', verifyToken, isAdmin, wardController.updateWard);
router.delete('/delete-ward', verifyToken, isAdmin, wardController.deleteWard);
router.post('/upload-voter-list', verifyToken, isAdmin, upload.single('file'), wardController.uploadVoterList);
router.post('/all-ward-admin', verifyToken, isAdmin, wardController.getAllWardsForAdmin);
router.post("/all-upload-history", verifyToken, isAdmin, wardController.getUploadHistory);
router.post("/upload-history", verifyToken, isAdmin, wardController.getUploadHistoryByElection);

module.exports = router;