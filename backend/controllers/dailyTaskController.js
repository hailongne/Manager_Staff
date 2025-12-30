/**
 * Daily Task Controller
 * API for managing daily tasks and KPI tasks
 */

const { DailyTask, User, Department, KpiCompletion, ProductionChainStep, ChainKpi } = require('../models');
const sequelize = require('../config/db');
const { Op } = require('sequelize');

/**
 * Get today's tasks for current user (assigned to them)
 */
exports.getMyTasksToday = async (req, res) => {
  console.log('getMyTasksToday called for user:', req.user?.user_id);
  try {
    // Defensive validation of req.user
    if (!req || !req.user || typeof req.user.user_id !== 'number') {
      console.error('Authentication failed: req.user is malformed or missing user_id');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.user_id;

    // Get today's date as YYYY-MM-DD string for DATEONLY compatibility
    const today = new Date().toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD format

    console.log('today:', today);
    // TEMP: Test without includes to isolate issue
    const tasks = await DailyTask.findAll({
      where: {
        assigned_to: userId,
        date: today
      },
      order: [
        [
          sequelize.literal(`FIELD(priority, 'HIGH', 'MEDIUM', 'LOW')`),
          'DESC'
        ],
        ['created_at', 'DESC']
      ]
    });
    console.log('tasks found:', tasks.length);

    // Backward-compatible response: always return array, handle null/undefined
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    res.json({ tasks: safeTasks });
  } catch (err) {
    console.error('🔥 getMyTasksToday ERROR');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Error parent:', err.parent);
    console.error('Error SQL:', err.sql);
    // Production-safe: never expose internal errors
    res.status(500).json({ tasks: [] });
  }
};

/**
 * Create a new daily task (Leader only)
 */
exports.createDailyTask = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { title, description, assigned_to, department_id, related_step_id, related_kpi_task_id, date, priority } = req.body;

    // Validate required fields
    if (!title || !assigned_to || !department_id || !date) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Check if user is leader of the department
    const user = await User.findByPk(userId, { include: [{ model: Department, as: 'managedDepartments' }] });
    if (!user || !user.managedDepartments || !user.managedDepartments.some(d => d.department_id === department_id)) {
      return res.status(403).json({ message: 'Không có quyền giao task cho phòng ban này' });
    }

    // Check if assigned_to is in the department
    const assignee = await User.findByPk(assigned_to);
    if (!assignee || assignee.department_id !== department_id) {
      return res.status(400).json({ message: 'Người nhận task không thuộc phòng ban' });
    }

    // Validate related_step_id if provided
    if (related_step_id) {
      const step = await ProductionChainStep.findByPk(related_step_id);
      if (!step) {
        return res.status(400).json({ message: 'Step không tồn tại' });
      }
    }

    // Validate related_kpi_task_id if provided
    if (related_kpi_task_id) {
      const kpiTask = await KpiCompletion.findByPk(related_kpi_task_id);
      if (!kpiTask) {
        return res.status(400).json({ message: 'KPI task không tồn tại' });
      }
    }

    const task = await DailyTask.create({
      title,
      description,
      assigned_by: userId,
      assigned_to,
      department_id,
      related_step_id,
      related_kpi_task_id,
      date,
      priority: priority || 'MEDIUM',
      status: 'PENDING'
    });

    const createdTask = await DailyTask.findByPk(task.task_id, {
      include: [
        { model: User, as: 'assignee', attributes: ['user_id', 'name'] },
        { model: User, as: 'assigner', attributes: ['user_id', 'name'] },
        { model: Department, as: 'department', attributes: ['department_id', 'name'] },
        { model: ProductionChainStep, as: 'relatedStep', attributes: ['step_id', 'title'] },
        { model: KpiCompletion, as: 'relatedKpiTask', attributes: ['kpi_completion_id', 'completion_type', 'week_index', 'date_iso'] }
      ]
    });

    res.status(201).json({ task: createdTask });
  } catch (err) {
    console.error('Create daily task error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Get daily tasks for leader (tasks they can manage in their department)
 */
exports.getDailyTasks = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { date, department_id } = req.query;

    console.log('getDailyTasks called for user:', userId, 'role:', req.user.role, 'department_position:', req.user.department_position);

    // Check if user is admin
    if (req.user.role === 'admin') {
      console.log('User is admin, allowing access to all departments');
      // Admin can see all tasks
      const whereClause = {};
      if (department_id) {
        whereClause.department_id = department_id;
      }
      if (date) {
        whereClause.date = date;
      }

      const tasks = await DailyTask.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'assignee', attributes: ['user_id', 'name'] },
          { model: User, as: 'assigner', attributes: ['user_id', 'name'] },
          { model: Department, as: 'department', attributes: ['department_id', 'name'] },
          { model: ProductionChainStep, as: 'relatedStep', attributes: ['step_id', 'title'] },
          { 
            model: KpiCompletion, 
            as: 'relatedKpiTask', 
            attributes: ['kpi_completion_id', 'completion_type', 'week_index', 'date_iso'],
            required: false
          }
        ],
        order: [
          ['date', 'DESC'],
          ['priority', 'DESC'],
          ['created_at', 'DESC']
        ]
      });

      return res.json({ tasks });
    }

    // For non-admin users, check if they are leaders
    let departmentIds = [];

    // Get user's managed departments (if they are assigned as manager)
    const user = await User.findByPk(userId, { include: [{ model: Department, as: 'managedDepartments' }] });
    if (user && user.managedDepartments && user.managedDepartments.length > 0) {
      departmentIds = user.managedDepartments.map(d => d.department_id);
      console.log('User has managed departments:', departmentIds);
    }

    // If no managed departments, check if user is a department head based on position
    if (departmentIds.length === 0) {
      const departmentHeadKeywords = [
        'truong ban',
        'truong phong', 
        'truong bo phan',
        'truong nhom',
        'nhom truong',
        'head',
        'manager',
        'director'
      ];

      const isDepartmentHead = req.user.department_position && 
        departmentHeadKeywords.some(keyword => 
          req.user.department_position
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .includes(keyword)
        );

      if (isDepartmentHead && req.user.department_id) {
        // Department head can see tasks in their own department
        departmentIds = [req.user.department_id];
        console.log('User is department head, allowing access to their department:', departmentIds);
      } else if (isDepartmentHead && !req.user.department_id) {
        console.log('User is department head but has no department assigned, returning 403');
        return res.status(403).json({ message: 'Không có quyền truy cập - chưa được phân công phòng ban' });
      } else {
        console.log('User is not a leader or department head, returning 403');
        return res.status(403).json({ message: 'Không có quyền truy cập' });
      }
    }

    const whereClause = {};
    if (department_id) {
      if (!departmentIds.includes(parseInt(department_id))) {
        return res.status(403).json({ message: 'Không có quyền truy cập phòng ban này' });
      }
      whereClause.department_id = department_id;
    } else {
      whereClause.department_id = { [Op.in]: departmentIds };
    }

    if (date) {
      whereClause.date = date;
    }

    const tasks = await DailyTask.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'assignee', attributes: ['user_id', 'name'] },
        { model: User, as: 'assigner', attributes: ['user_id', 'name'] },
        { model: Department, as: 'department', attributes: ['department_id', 'name'] },
        { model: ProductionChainStep, as: 'relatedStep', attributes: ['step_id', 'title'] },
        { 
          model: KpiCompletion, 
          as: 'relatedKpiTask', 
          attributes: ['kpi_completion_id', 'completion_type', 'week_index', 'date_iso'],
          required: false
        }
      ],
      order: [
        ['date', 'DESC'],
        ['priority', 'DESC'],
        ['created_at', 'DESC']
      ]
    });

    res.json({ tasks });
  } catch (err) {
    console.error('Get daily tasks error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Get department members (for leaders to assign tasks)
 */
exports.getDepartmentMembers = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = await User.findByPk(userId);

    if (!user || !user.department_id) {
      return res.status(400).json({ message: 'Người dùng không thuộc phòng ban nào' });
    }

    const members = await User.findAll({
      where: {
        department_id: user.department_id,
        role: { [Op.ne]: 'admin' } // Exclude admins
      },
      attributes: ['user_id', 'name', 'username', 'position', 'department_position'],
      order: [['name', 'ASC']]
    });

    res.json({ members });
  } catch (err) {
    console.error('Get department members error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Create new task
 */
exports.createTask = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { title, description, assigned_to, department_id, related_step_id, related_kpi_task_id, date, priority } = req.body;

    // Validate required fields
    if (!title || !assigned_to || !department_id || !date) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Check if user is leader of the department
    const user = await User.findByPk(userId, { include: [{ model: Department, as: 'managedDepartments' }] });
    if (!user || !user.managedDepartments || !user.managedDepartments.some(d => d.department_id === department_id)) {
      return res.status(403).json({ message: 'Không có quyền giao task cho phòng ban này' });
    }

    // Check if assigned_to is in the department
    const assignee = await User.findByPk(assigned_to);
    if (!assignee || assignee.department_id !== department_id) {
      return res.status(400).json({ message: 'Người nhận task không thuộc phòng ban' });
    }

    // Validate related_step_id if provided
    if (related_step_id) {
      const step = await ProductionChainStep.findByPk(related_step_id);
      if (!step) {
        return res.status(400).json({ message: 'Step không tồn tại' });
      }
    }

    // Validate related_kpi_task_id if provided
    if (related_kpi_task_id) {
      const kpiTask = await KpiCompletion.findByPk(related_kpi_task_id);
      if (!kpiTask) {
        return res.status(400).json({ message: 'KPI task không tồn tại' });
      }
    }

    const task = await DailyTask.create({
      title,
      description,
      assigned_by: userId,
      assigned_to,
      department_id,
      related_step_id,
      related_kpi_task_id,
      date,
      priority: priority || 'MEDIUM',
      status: 'PENDING'
    });

    const createdTask = await DailyTask.findByPk(task.task_id, {
      include: [
        { model: User, as: 'assignee', attributes: ['user_id', 'name'] },
        { model: User, as: 'assigner', attributes: ['user_id', 'name'] },
        { model: Department, as: 'department', attributes: ['department_id', 'name'] },
        { model: ProductionChainStep, as: 'relatedStep', attributes: ['step_id', 'title'] },
        { 
          model: KpiCompletion, 
          as: 'relatedKpiTask', 
          attributes: ['kpi_completion_id', 'completion_type', 'week_index', 'date_iso'],
          required: false
        }
      ]
    });

    res.status(201).json({ task: createdTask });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Update task status
 */
exports.updateTaskStatus = async (req, res) => {
  try {
    const { task_id } = req.params;
    const { status } = req.body;
    const userId = req.user.user_id;

    const task = await DailyTask.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ message: 'Nhiệm vụ không tồn tại' });
    }

    const user = await User.findByPk(userId);

    // Permission checks based on role and action
    if (status === 'DOING' || status === 'COMPLETED' || status === 'BLOCKED') {
      // Employee actions: only assignee can perform
      if (task.assigned_to !== userId) {
        return res.status(403).json({ message: 'Chỉ người được giao mới có thể thực hiện hành động này' });
      }

      // Validate transitions
      if (status === 'DOING' && task.status !== 'PENDING') {
        return res.status(400).json({ message: 'Chỉ có thể bắt đầu task ở trạng thái PENDING' });
      }
      if (status === 'COMPLETED' && task.status !== 'DOING') {
        return res.status(400).json({ message: 'Chỉ có thể hoàn thành task ở trạng thái DOING' });
      }
    } else if (status === 'COMPLETED' && task.status === 'WAITING_CONFIRM') {
      // Leader confirm action
      if (user.role !== 'leader' && user.role !== 'admin') {
        return res.status(403).json({ message: 'Chỉ leader hoặc admin mới có thể xác nhận' });
      }
      // Check if leader manages the department
      const managesDept = user.managedDepartments && user.managedDepartments.some(d => d.department_id === task.department_id);
      if (user.role === 'leader' && !managesDept) {
        return res.status(403).json({ message: 'Không có quyền xác nhận task của phòng ban này' });
      }
    } else {
      return res.status(400).json({ message: 'Hành động không hợp lệ' });
    }

    await task.update({ status });

    const updatedTask = await DailyTask.findByPk(task_id, {
      include: [
        { model: User, as: 'assignee', attributes: ['user_id', 'name'] },
        { model: User, as: 'assigner', attributes: ['user_id', 'name'] },
        { model: Department, as: 'department', attributes: ['department_id', 'name'] }
      ]
    });

    res.json({ task: updatedTask });
  } catch (err) {
    console.error('Update task status error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Start task (Employee: PENDING -> DOING)
 */
exports.startTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    const userId = req.user.user_id;

    const task = await DailyTask.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ message: 'Task không tồn tại' });
    }

    if (task.assigned_to !== userId) {
      return res.status(403).json({ message: 'Không có quyền thực hiện' });
    }

    if (task.status !== 'PENDING') {
      return res.status(400).json({ message: 'Chỉ có thể bắt đầu task ở trạng thái PENDING' });
    }

    await task.update({ status: 'DOING' });

    res.json({ message: 'Đã bắt đầu task' });
  } catch (err) {
    console.error('Start task error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Complete task (Employee: DOING -> WAITING_CONFIRM)
 */
exports.completeTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    const userId = req.user.user_id;

    const task = await DailyTask.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ message: 'Task không tồn tại' });
    }

    if (task.assigned_to !== userId) {
      return res.status(403).json({ message: 'Không có quyền thực hiện' });
    }

    if (task.status !== 'DOING') {
      return res.status(400).json({ message: 'Chỉ có thể hoàn thành task ở trạng thái DOING' });
    }

    await task.update({ status: 'WAITING_CONFIRM' });

    res.json({ message: 'Đã gửi yêu cầu xác nhận hoàn thành' });
  } catch (err) {
    console.error('Complete task error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Block task (Employee: any -> BLOCKED)
 */
exports.blockTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    const userId = req.user.user_id;

    const task = await DailyTask.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ message: 'Task không tồn tại' });
    }

    if (task.assigned_to !== userId) {
      return res.status(403).json({ message: 'Không có quyền thực hiện' });
    }

    await task.update({ status: 'BLOCKED' });

    res.json({ message: 'Đã chặn task' });
  } catch (err) {
    console.error('Block task error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Confirm task (Leader: WAITING_CONFIRM -> COMPLETED)
 */
exports.confirmTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    const userId = req.user.user_id;

    const task = await DailyTask.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ message: 'Task không tồn tại' });
    }

    const user = await User.findByPk(userId, { include: [{ model: Department, as: 'managedDepartments' }] });
    if (user.role !== 'leader' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền xác nhận' });
    }

    if (user.role === 'leader' && !user.managedDepartments.some(d => d.department_id === task.department_id)) {
      return res.status(403).json({ message: 'Không có quyền xác nhận task của phòng ban này' });
    }

    if (task.status !== 'WAITING_CONFIRM') {
      return res.status(400).json({ message: 'Task không ở trạng thái chờ xác nhận' });
    }

    await task.update({ status: 'COMPLETED' });

    res.json({ message: 'Đã xác nhận hoàn thành task' });
  } catch (err) {
    console.error('Confirm task error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Reject task (Leader: WAITING_CONFIRM -> DOING)
 */
exports.rejectTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    const userId = req.user.user_id;

    const task = await DailyTask.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ message: 'Task không tồn tại' });
    }

    const user = await User.findByPk(userId, { include: [{ model: Department, as: 'managedDepartments' }] });
    if (user.role !== 'leader' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền từ chối' });
    }

    if (user.role === 'leader' && !user.managedDepartments.some(d => d.department_id === task.department_id)) {
      return res.status(403).json({ message: 'Không có quyền từ chối task của phòng ban này' });
    }

    if (task.status !== 'WAITING_CONFIRM') {
      return res.status(400).json({ message: 'Task không ở trạng thái chờ xác nhận' });
    }

    await task.update({ status: 'DOING' });

    res.json({ message: 'Đã từ chối và trả lại task để làm lại' });
  } catch (err) {
    console.error('Reject task error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Delete task
 */
exports.deleteTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    const userId = req.user.user_id;

    const task = await DailyTask.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ message: 'Nhiệm vụ không tồn tại' });
    }

    // Check permissions - only assigner or admin can delete
    const user = await User.findByPk(userId);
    if (task.assigned_by !== userId && user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền xóa nhiệm vụ này' });
    }

    await task.destroy();

    res.json({ message: 'Xóa nhiệm vụ thành công' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};