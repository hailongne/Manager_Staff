/**
 * Task Routes
 * RESTful API for task management
 * 
 * Base path: /api/tasks
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const taskController = require('../controllers/taskController');

// All routes require authentication
router.use(auth);

// ============= ADMIN ROUTES =============
// GET /api/tasks/admin - Get all tasks (admin)
router.get('/admin', authorize('admin'), taskController.getAllTasksAdmin);

// ============= USER ROUTES =============
// GET /api/tasks - Get user's tasks
router.get('/', taskController.getTasks);

// POST /api/tasks - Create new task
router.post('/', taskController.createTask);

// GET /api/tasks/:id - Get task by ID
router.get('/:id', taskController.getTaskById);

// PUT /api/tasks/:id - Update task
router.put('/:id', taskController.updateTask);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', taskController.deleteTask);

// ============= TASK ACTIONS =============
// PATCH /api/tasks/:id/complete - Mark task as completed
router.patch('/:id/complete', taskController.markCompleted);

// POST /api/tasks/:id/approve - Approve task (admin)
router.post('/:id/approve', authorize('admin'), taskController.approveTask);

// POST /api/tasks/:id/reject - Reject task (admin)
router.post('/:id/reject', authorize('admin'), taskController.rejectTask);

// POST /api/tasks/:id/acknowledge - Acknowledge task
router.post('/:id/acknowledge', taskController.acknowledgeTask);

module.exports = router;
