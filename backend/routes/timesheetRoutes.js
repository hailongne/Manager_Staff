const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const timesheetController = require('../controllers/timesheetController');

// User actions
router.post('/checkin', auth, timesheetController.checkIn);
router.post('/checkout', auth, timesheetController.checkOut);
router.get('/me', auth, timesheetController.getMyTimesheets);

// Admin stats
router.get('/stats/weekly', auth, authorize('admin'), timesheetController.getWeeklyStats);
router.get('/stats/monthly', auth, authorize('admin'), timesheetController.getMonthlyStats);

module.exports = router;
