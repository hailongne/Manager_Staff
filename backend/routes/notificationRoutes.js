const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getNotifications, markAsRead, deleteNotification, clearNotifications, markAllAsRead } = require('../controllers/notificationController');

router.use(auth);

router.get('/', getNotifications);
router.post('/mark-all-read', markAllAsRead);
router.post('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.delete('/', clearNotifications);

module.exports = router;
