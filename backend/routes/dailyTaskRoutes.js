/**
 * Daily Task Routes
 */

const express = require('express');
const router = express.Router();
const dailyTaskController = require('../controllers/dailyTaskController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Employee routes
router.get('/my-tasks/today', dailyTaskController.getMyTasksToday);
router.put('/:task_id/start', dailyTaskController.startTask);
router.put('/:task_id/complete', dailyTaskController.completeTask);
router.put('/:task_id/block', dailyTaskController.blockTask);

// Leader routes
router.post('/', roleMiddleware(['admin', 'leader']), dailyTaskController.createTask);
router.get('/', roleMiddleware(['admin', 'leader']), dailyTaskController.getDailyTasks);
router.put('/:task_id/confirm', roleMiddleware(['admin', 'leader']), dailyTaskController.confirmTask);
router.put('/:task_id/reject', roleMiddleware(['admin', 'leader']), dailyTaskController.rejectTask);

// Legacy routes (can be removed later)
router.get('/my-tasks', dailyTaskController.getMyTasksToday); // Updated to use new function
router.get('/assigned-tasks', dailyTaskController.getDailyTasks); // Updated to use new function
router.get('/department-members', roleMiddleware(['admin', 'leader']), dailyTaskController.getDepartmentMembers);
router.patch('/:task_id/status', dailyTaskController.updateTaskStatus);
router.delete('/:task_id', dailyTaskController.deleteTask);

module.exports = router;