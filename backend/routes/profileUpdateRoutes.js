const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  submitProfileUpdate,
  getPendingRequests,
  reviewRequest,
  getMyRequests,
  getHistory,
  deleteRequest,
  clearHistory
} = require('../controllers/profileUpdateController');

router.use(auth);

router.post('/', submitProfileUpdate);
router.get('/me', getMyRequests);
router.get('/history', authorize('admin'), getHistory);
router.get('/pending', authorize('admin'), getPendingRequests);
router.post('/:id/review', authorize('admin'), reviewRequest);

module.exports = router;
