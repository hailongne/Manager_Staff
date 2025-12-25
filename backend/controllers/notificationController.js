const { Op } = require('sequelize');
const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};

    if (req.user.role === 'admin') {
      where[Op.or] = [
        { recipient_role: 'admin', recipient_user_id: null },
        { recipient_role: 'admin', recipient_user_id: req.user.user_id }
      ];
    } else {
      where.recipient_role = 'user';
      where.recipient_user_id = req.user.user_id;
    }

    if (status) {
      where.status = status;
    }

    const notifications = await Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 50
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại' });
    }

    if (req.user.role === 'admin') {
      if (
        notification.recipient_role !== 'admin' ||
        (notification.recipient_user_id && notification.recipient_user_id !== req.user.user_id)
      ) {
        return res.status(403).json({ message: 'Không có quyền với thông báo này' });
      }
    } else if (notification.recipient_role !== 'user' || notification.recipient_user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Không có quyền với thông báo này' });
    }

    await notification.update({ status: 'read' });
    res.json({ message: 'Đã đánh dấu đã đọc', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại' });
    }

    if (req.user.role === 'admin') {
      if (
        notification.recipient_role !== 'admin' ||
        (notification.recipient_user_id && notification.recipient_user_id !== req.user.user_id)
      ) {
        return res.status(403).json({ message: 'Không có quyền với thông báo này' });
      }
    } else if (notification.recipient_role !== 'user' || notification.recipient_user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Không có quyền với thông báo này' });
    }

    await notification.destroy();

    res.json({ message: 'Đã xóa thông báo' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.clearNotifications = async (req, res) => {
  try {
    const where = {};

    if (req.user.role === 'admin') {
      where[Op.or] = [
        { recipient_role: 'admin', recipient_user_id: null },
        { recipient_role: 'admin', recipient_user_id: req.user.user_id }
      ];
    } else {
      where.recipient_role = 'user';
      where.recipient_user_id = req.user.user_id;
    }

    const removed = await Notification.destroy({ where });

    res.json({ message: 'Đã xóa lịch sử thông báo', removed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const where = { status: 'unread' };

    if (req.user.role === 'admin') {
      where[Op.or] = [
        { recipient_role: 'admin', recipient_user_id: null },
        { recipient_role: 'admin', recipient_user_id: req.user.user_id }
      ];
    } else {
      where.recipient_role = 'user';
      where.recipient_user_id = req.user.user_id;
    }

    const [updated] = await Notification.update({ status: 'read' }, { where });

    res.json({ message: 'Đã đánh dấu toàn bộ thông báo đã đọc', updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
