/**
 * Task Controller
 * Handle HTTP requests for task operations
 */

const taskService = require('../services/taskService');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Create task
 */
exports.createTask = async (req, res) => {
  try {
    const task = await taskService.createTask(req.body, req.user);
    res.status(HTTP_STATUS.CREATED).json(task);
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Get user's tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const result = await taskService.getUserTasks(req.user.user_id, req.query);
    res.json(result);
  } catch (err) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

/**
 * Admin: get all tasks
 */
exports.getAllTasksAdmin = async (req, res) => {
  try {
    const result = await taskService.getAllTasks(req.query);
    res.json(result);
  } catch (err) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

/**
 * Get task by ID
 */
exports.getTaskById = async (req, res) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user);
    res.json(task);
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Update task
 */
exports.updateTask = async (req, res) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user);
    res.json(task);
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Delete task
 */
exports.deleteTask = async (req, res) => {
  try {
    await taskService.deleteTask(req.params.id, req.user);
    res.json({ message: 'Xoá task thành công' });
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Mark task as completed
 */
exports.markCompleted = async (req, res) => {
  try {
    const task = await taskService.markCompleted(req.params.id, req.user);
    res.json(task);
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Admin: approve pending task
 */
exports.approveTask = async (req, res) => {
  try {
    const { updates = {} } = req.body;
    const task = await taskService.approveTask(req.params.id, updates, req.user);
    res.json(task);
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Admin: reject pending task
 */
exports.rejectTask = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const result = await taskService.rejectTask(req.params.id, reason, req.user);
    
    if (result.deleted) {
      return res.json({ message: 'Đã từ chối yêu cầu tạo nhiệm vụ', deleted: true, task_id: result.task_id });
    }
    res.json(result);
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Acknowledge task
 */
exports.acknowledgeTask = async (req, res) => {
  try {
    const task = await taskService.acknowledgeTask(req.params.id, req.user);
    res.json(task);
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};
