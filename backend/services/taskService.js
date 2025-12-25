/**
 * Task Service
 * Business logic for task operations
 */

const { Op } = require('sequelize');
const { Task, User } = require('../models');
const { createAdminNotification, createUserNotification } = require('../utils/notificationService');
const { normalizeString } = require('../utils/validators');
const { ERROR_MESSAGES } = require('../utils/constants');

class TaskService {
  /**
   * Create new task
   */
  async createTask(data, authUser) {
    const { title, description, date, result_link, user_id: targetUserId } = data;
    
    if (!title) {
      throw { status: 400, message: 'Title là bắt buộc' };
    }

    let assignedUserId = authUser.user_id;
    const isAdmin = authUser.role === 'admin';

    if (isAdmin) {
      if (!targetUserId) {
        throw { status: 400, message: 'Admin cần cung cấp user_id khi giao nhiệm vụ' };
      }
      const targetUser = await User.findByPk(targetUserId);
      if (!targetUser) {
        throw { status: 404, message: 'Người dùng được giao không tồn tại' };
      }
      assignedUserId = targetUser.user_id;
    } else if (targetUserId && Number(targetUserId) !== authUser.user_id) {
      throw { status: 403, message: 'Không thể giao nhiệm vụ cho người khác' };
    }

    const initialStatus = isAdmin ? 'in_progress' : 'pending';
    const task = await Task.create({
      user_id: assignedUserId,
      title,
      description: description || '',
      result_link: result_link || null,
      status: initialStatus,
      date: date ? new Date(date) : new Date(),
      pending_action: isAdmin ? null : 'create',
      pending_requested_by: isAdmin ? null : authUser.user_id
    });

    // Send notifications
    await this._notifyTaskCreation(task, authUser, assignedUserId, isAdmin);

    return task;
  }

  /**
   * Get user's tasks with pagination
   */
  async getUserTasks(userId, filters) {
    const { page = 1, limit = 10, status, q, startDate, endDate } = filters;
    const offset = (Number(page) - 1) * Number(limit);

    const where = { user_id: userId };
    if (status) where.status = status;
    if (q) where.title = { [Op.like]: `%${q}%` };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { [Op.gte]: start, [Op.lte]: end };
    }

    const { rows, count } = await Task.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset
    });

    return {
      items: rows,
      total: count,
      page: Number(page),
      pages: Math.ceil(count / Number(limit))
    };
  }

  /**
   * Get all tasks (admin)
   */
  async getAllTasks(filters) {
    const { page = 1, limit = 10, status, user_id, q, startDate, endDate, tab } = filters;
    const offset = (Number(page) - 1) * Number(limit);

    const baseWhere = {};
    if (user_id) baseWhere.user_id = Number(user_id);
    if (q) baseWhere.title = { [Op.like]: `%${q}%` };

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      baseWhere.date = { [Op.gte]: start, [Op.lte]: end };
    }

    const where = { ...baseWhere };
    if (tab === 'approvals') {
      where.status = 'pending';
    } else if (status) {
      where.status = status;
    }

    const { rows, count } = await Task.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset
    });

    const pendingApprovalCount = await Task.count({ 
      where: { ...baseWhere, status: 'pending' } 
    });

    return {
      items: rows,
      total: count,
      page: Number(page),
      pages: Math.ceil(count / Number(limit)),
      pendingApprovalCount
    };
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId, authUser) {
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw { status: 404, message: ERROR_MESSAGES.TASK_NOT_FOUND };
    }

    if (authUser.role !== 'admin' && task.user_id !== authUser.user_id) {
      throw { status: 403, message: ERROR_MESSAGES.FORBIDDEN };
    }

    return task;
  }

  /**
   * Update task
   */
  async updateTask(taskId, data, authUser) {
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw { status: 404, message: ERROR_MESSAGES.TASK_NOT_FOUND };
    }

    const isAdmin = authUser.role === 'admin';
    const isOwner = task.user_id === authUser.user_id;

    if (!isAdmin && !isOwner) {
      throw { status: 403, message: ERROR_MESSAGES.FORBIDDEN };
    }

    if (isAdmin) {
      return this._adminUpdateTask(task, data);
    }

    return this._userUpdateTask(task, data, authUser);
  }

  /**
   * Delete task (admin only)
   */
  async deleteTask(taskId, authUser) {
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw { status: 404, message: ERROR_MESSAGES.TASK_NOT_FOUND };
    }

    if (authUser.role !== 'admin') {
      throw { status: 403, message: 'Chỉ quản trị viên mới được xóa nhiệm vụ trực tiếp' };
    }

    await task.destroy();
    return true;
  }

  /**
   * Mark task as completed
   */
  async markCompleted(taskId, authUser) {
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw { status: 404, message: ERROR_MESSAGES.TASK_NOT_FOUND };
    }

    if (authUser.role !== 'admin' && task.user_id !== authUser.user_id) {
      throw { status: 403, message: ERROR_MESSAGES.FORBIDDEN };
    }

    if (task.status === 'pending') {
      throw { status: 400, message: 'Nhiệm vụ đang chờ phê duyệt, không thể đánh dấu hoàn thành' };
    }

    const previousStatus = task.status;
    await task.update({
      status: 'completed',
      completed_at: new Date()
    });

    if (authUser.role !== 'admin' && previousStatus !== 'completed') {
      const actorLabel = authUser.name ? `Nhân viên ${authUser.name}` : 'Nhân viên';
      await createAdminNotification({
        type: 'task',
        title: 'Nhiệm vụ hoàn thành',
        message: `${actorLabel} đánh dấu hoàn thành nhiệm vụ "${task.title}"`,
        metadata: { task_id: task.task_id, status: 'completed' },
        entityType: 'task',
        entityId: task.task_id
      }).catch(console.warn);
    }

    return task;
  }

  /**
   * Approve pending task (admin)
   */
  async approveTask(taskId, updates, authUser) {
    if (authUser.role !== 'admin') {
      throw { status: 403, message: ERROR_MESSAGES.FORBIDDEN };
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      throw { status: 404, message: ERROR_MESSAGES.TASK_NOT_FOUND };
    }

    if (task.status !== 'pending') {
      throw { status: 400, message: 'Nhiệm vụ không ở trạng thái chờ phê duyệt' };
    }

    const pendingAction = task.pending_action || 'update';
    const pendingChanges = task.pending_changes || {};
    const approvedUpdates = this._buildApprovalUpdates(task, pendingAction, pendingChanges, updates);

    await task.update(approvedUpdates);
    await task.reload();

    // Notify user
    const messageMap = {
      create: `Nhiệm vụ "${task.title}" đã được phê duyệt, hãy bắt đầu thực hiện nhé!`,
      update: `Yêu cầu cập nhật nhiệm vụ "${task.title}" đã được phê duyệt`,
      cancel: `Yêu cầu hủy nhiệm vụ "${task.title}" đã được chấp thuận`
    };

    await createUserNotification({
      type: 'task',
      title: 'Phê duyệt nhiệm vụ',
      message: messageMap[pendingAction] || `Nhiệm vụ "${task.title}" đã được cập nhật`,
      metadata: { task_id: task.task_id, action: pendingAction },
      entityType: 'task',
      entityId: task.task_id,
      recipientUserId: task.user_id
    }).catch(console.warn);

    return task;
  }

  /**
   * Reject pending task (admin)
   */
  async rejectTask(taskId, reason, authUser) {
    if (authUser.role !== 'admin') {
      throw { status: 403, message: ERROR_MESSAGES.FORBIDDEN };
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      throw { status: 404, message: ERROR_MESSAGES.TASK_NOT_FOUND };
    }

    if (task.status !== 'pending') {
      throw { status: 400, message: 'Nhiệm vụ không ở trạng thái chờ phê duyệt' };
    }

    const trimmedReason = normalizeString(reason);
    if (!trimmedReason) {
      throw { status: 400, message: 'Vui lòng cung cấp lý do từ chối' };
    }

    const pendingAction = task.pending_action || 'update';
    const pendingChanges = task.pending_changes || {};
    const previousStatus = pendingChanges.previous_status || 'in_progress';

    const notifyRejection = async (message) => {
      await createUserNotification({
        type: 'task',
        title: 'Yêu cầu bị từ chối',
        message,
        metadata: { task_id: task.task_id, action: pendingAction },
        entityType: 'task',
        entityId: task.task_id,
        recipientUserId: task.user_id
      }).catch(console.warn);
    };

    if (pendingAction === 'create') {
      const taskTitle = task.title;
      await notifyRejection(`Đề xuất tạo nhiệm vụ "${taskTitle}" bị từ chối. Lý do: ${trimmedReason}`);
      await task.destroy();
      return { deleted: true, task_id: taskId };
    }

    await task.update({
      status: previousStatus,
      pending_action: null,
      pending_changes: null,
      pending_reason: null,
      pending_requested_by: null,
      cancel_reason: pendingAction === 'cancel' ? null : task.cancel_reason
    });
    await task.reload();

    const messageMap = {
      update: `Yêu cầu cập nhật nhiệm vụ "${task.title}" bị từ chối. Lý do: ${trimmedReason}`,
      cancel: `Yêu cầu hủy nhiệm vụ "${task.title}" bị từ chối. Lý do: ${trimmedReason}`
    };
    await notifyRejection(messageMap[pendingAction] || `Nhiệm vụ bị từ chối. Lý do: ${trimmedReason}`);

    return task;
  }

  /**
   * Acknowledge task
   */
  async acknowledgeTask(taskId, authUser) {
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw { status: 404, message: ERROR_MESSAGES.TASK_NOT_FOUND };
    }

    if (authUser.role !== 'admin' && task.user_id !== authUser.user_id) {
      throw { status: 403, message: 'Bạn không có quyền xác nhận nhiệm vụ này' };
    }

    if (task.status === 'pending') {
      throw { status: 400, message: 'Không thể xác nhận nhiệm vụ đang chờ phê duyệt' };
    }

    await task.update({ acknowledged: true });

    const user = await User.findByPk(authUser.user_id);
    const userName = user?.name || `Nhân viên #${authUser.user_id}`;
    await createAdminNotification({
      type: 'task',
      title: 'Xác nhận nhiệm vụ',
      message: `${userName} đã xác nhận nhận nhiệm vụ "${task.title}"`,
      metadata: { task_id: task.task_id, acknowledged: true }
    }).catch(console.warn);

    return task;
  }

  // Private methods

  async _notifyTaskCreation(task, authUser, assignedUserId, isAdmin) {
    if (isAdmin && assignedUserId !== authUser.user_id) {
      const assignerName = authUser.name || 'Quản trị';
      const dueText = task.date ? new Date(task.date).toLocaleDateString('vi-VN') : 'hôm nay';
      await createUserNotification({
        type: 'task',
        title: 'Nhiệm vụ mới',
        message: `Bạn được ${assignerName} giao nhiệm vụ "${task.title}". Thời hạn: ${dueText}.`,
        metadata: { task_id: task.task_id, date: task.date },
        entityType: 'task',
        entityId: task.task_id,
        recipientUserId: assignedUserId
      }).catch(console.warn);
    } else if (!isAdmin) {
      const actorLabel = authUser.name ? `Nhân viên ${authUser.name}` : 'Nhân viên';
      await createAdminNotification({
        type: 'task',
        title: 'Yêu cầu nhiệm vụ mới',
        message: `${actorLabel} đề xuất nhiệm vụ "${task.title}" chờ phê duyệt`,
        metadata: { task_id: task.task_id, action: 'create' },
        entityType: 'task',
        entityId: task.task_id
      }).catch(console.warn);
    }
  }

  async _adminUpdateTask(task, data) {
    const { title, description, status, result_link, cancel_reason } = data;
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (result_link !== undefined) updates.result_link = result_link;
    if (cancel_reason !== undefined) updates.cancel_reason = cancel_reason;

    if (status !== undefined) {
      updates.status = status;
      updates.completed_at = status === 'completed' ? new Date() : null;
    }

    // Clear pending state if task was pending
    if (task.pending_action) {
      updates.pending_action = null;
      updates.pending_changes = null;
      updates.pending_reason = null;
      updates.pending_requested_by = null;
      if (!status && task.status === 'pending') {
        updates.status = 'in_progress';
        updates.completed_at = null;
      }
    }

    await task.update(updates);
    await task.reload();
    return task;
  }

  async _userUpdateTask(task, data, authUser) {
    const { title, description, status, result_link, approval_reason, cancel_reason } = data;

    // Prevent interaction with pending tasks
    if (task.status === 'pending' && task.pending_action) {
      throw { status: 400, message: 'Nhiệm vụ đang chờ phê duyệt, không thể cập nhật' };
    }

    // Allow completing without approval
    if (status === 'completed') {
      await task.update({
        status: 'completed',
        completed_at: new Date(),
        pending_action: null,
        pending_changes: null,
        pending_reason: null,
        pending_requested_by: null
      });

      const actorLabel = authUser.name ? `Nhân viên ${authUser.name}` : 'Nhân viên';
      await createAdminNotification({
        type: 'task',
        title: 'Nhiệm vụ hoàn thành',
        message: `${actorLabel} đánh dấu hoàn thành nhiệm vụ "${task.title}"`,
        metadata: { task_id: task.task_id, status: 'completed' },
        entityType: 'task',
        entityId: task.task_id
      }).catch(console.warn);

      return task;
    }

    // Require approval reason
    const sanitizedReason = normalizeString(approval_reason || cancel_reason);
    if (!sanitizedReason) {
      throw { status: 400, message: 'Vui lòng cung cấp lý do để yêu cầu phê duyệt' };
    }

    const pendingChanges = {};
    if (title !== undefined && title.trim() !== task.title) pendingChanges.title = title.trim();
    if (description !== undefined && description.trim() !== (task.description || '')) {
      pendingChanges.description = description.trim();
    }
    if (result_link !== undefined && result_link.trim() !== (task.result_link || '')) {
      pendingChanges.result_link = result_link.trim();
    }

    let pendingAction = 'update';
    if (status === 'cancelled') {
      pendingAction = 'cancel';
      pendingChanges.status = 'cancelled';
      pendingChanges.cancel_reason = sanitizedReason;
    } else if (status !== undefined && status !== task.status) {
      pendingChanges.status = status;
    }

    if (Object.keys(pendingChanges).length === 0) {
      throw { status: 400, message: 'Không tìm thấy thay đổi nào cần phê duyệt' };
    }

    pendingChanges.previous_status = task.status;

    await task.update({
      pending_action: pendingAction,
      pending_reason: sanitizedReason,
      pending_changes: pendingChanges,
      pending_requested_by: authUser.user_id,
      status: 'pending',
      cancel_reason: pendingAction === 'cancel' ? sanitizedReason : task.cancel_reason
    });
    await task.reload();

    const actorLabel = authUser.name ? `Nhân viên ${authUser.name}` : 'Nhân viên';
    await createAdminNotification({
      type: 'task',
      title: 'Yêu cầu phê duyệt nhiệm vụ',
      message: `${actorLabel} yêu cầu ${pendingAction === 'cancel' ? 'hủy' : 'cập nhật'} nhiệm vụ "${task.title}"`,
      metadata: { task_id: task.task_id, action: pendingAction },
      entityType: 'task',
      entityId: task.task_id
    }).catch(console.warn);

    return task;
  }

  _buildApprovalUpdates(task, pendingAction, pendingChanges, updates) {
    const approvedUpdates = {
      pending_action: null,
      pending_changes: null,
      pending_reason: null,
      pending_requested_by: null
    };

    if (pendingAction === 'create') {
      approvedUpdates.title = updates.title ?? task.title;
      approvedUpdates.description = updates.description ?? task.description;
      approvedUpdates.result_link = updates.result_link ?? task.result_link;
      const finalStatus = updates.status ?? 'in_progress';
      approvedUpdates.status = finalStatus === 'pending' ? 'in_progress' : finalStatus;
      approvedUpdates.completed_at = finalStatus === 'completed' ? new Date() : null;
      if (updates.date !== undefined) {
        approvedUpdates.date = updates.date ? new Date(updates.date) : null;
      }
    } else if (pendingAction === 'update') {
      const requestedFields = { ...pendingChanges };
      delete requestedFields.previous_status;
      const merged = { ...requestedFields, ...updates };
      const previousStatus = pendingChanges.previous_status || 'in_progress';
      const finalStatus = merged.status ?? previousStatus;

      if (merged.title !== undefined) approvedUpdates.title = merged.title;
      if (merged.description !== undefined) approvedUpdates.description = merged.description;
      if (merged.result_link !== undefined) approvedUpdates.result_link = merged.result_link;
      if (merged.cancel_reason !== undefined) approvedUpdates.cancel_reason = merged.cancel_reason;
      if (merged.date !== undefined) approvedUpdates.date = merged.date ? new Date(merged.date) : null;

      approvedUpdates.status = finalStatus === 'pending' ? previousStatus : finalStatus;
      approvedUpdates.completed_at = approvedUpdates.status === 'completed' ? new Date() : null;
    } else if (pendingAction === 'cancel') {
      approvedUpdates.status = 'cancelled';
      approvedUpdates.cancel_reason = updates.cancel_reason ?? pendingChanges.cancel_reason ?? task.pending_reason;
      approvedUpdates.completed_at = null;
    }

    return approvedUpdates;
  }
}

module.exports = new TaskService();
