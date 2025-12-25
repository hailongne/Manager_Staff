const { Op } = require('sequelize');
const ProfileUpdateRequest = require('../models/ProfileUpdateRequest');
const User = require('../models/User');
const { createAdminNotification, createUserNotification, markNotificationsReadByEntity } = require('../utils/notificationService');

const ALLOWED_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'position',
  'date_joined',
  'employment_status',
  'work_shift_start',
  'work_shift_end',
  'note'
];

const normalizeEmail = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const sanitizeChanges = (payload = {}) => {
  const changes = {};
  ALLOWED_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      const value = payload[field];
      if (value === undefined) return;
      if (field === 'email') {
        const normalized = normalizeEmail(value);
        if (!normalized) return;
        changes[field] = normalized;
        return;
      }
      changes[field] = value === '' ? null : value;
    }
  });
  return changes;
};

const mapUserProfile = (userInstance) => {
  if (!userInstance) return null;
  const plain = userInstance.get ? userInstance.get({ plain: true }) : userInstance;
  const {
    user_id,
    name,
    email,
    phone,
    position,
    address,
    date_joined,
    employment_status,
    official_confirmed_at,
    annual_leave_quota,
    remaining_leave_days,
    work_shift_start,
    work_shift_end,
    note,
    avatar,
    username,
    updated_at
  } = plain;

  return {
    user_id,
    name,
    email,
    phone,
    position,
    address,
    date_joined,
    employment_status,
    official_confirmed_at: official_confirmed_at ? new Date(official_confirmed_at).toISOString() : null,
    annual_leave_quota: annual_leave_quota != null ? Number(annual_leave_quota) : null,
    remaining_leave_days: remaining_leave_days != null ? Number(remaining_leave_days) : null,
    work_shift_start,
    work_shift_end,
    note,
    avatar,
    username,
    updated_at
  };
};

exports.submitProfileUpdate = async (req, res) => {
  try {
    const changes = sanitizeChanges(req.body || {});

    const currentUser = await User.findByPk(req.user.user_id);
    if (!currentUser) {
      return res.status(404).json({ message: 'Nhân viên không tồn tại' });
    }

    if (Object.prototype.hasOwnProperty.call(changes, 'email')) {
      const nextEmail = changes.email;
      if (!nextEmail) {
        return res.status(400).json({ message: 'Email không hợp lệ' });
      }

      const existingEmail = await User.findOne({
        where: {
          email: nextEmail,
          user_id: { [Op.ne]: currentUser.user_id }
        }
      });

      if (existingEmail) {
        return res.status(400).json({ message: 'Email đã tồn tại' });
      }

      const currentEmail = normalizeEmail(currentUser.email);
      if (currentEmail === nextEmail) {
        delete changes.email;
      }
    }

    if (!Object.keys(changes).length) {
      return res.status(400).json({ message: 'Vui lòng nhập thông tin cần cập nhật' });
    }

    const request = await ProfileUpdateRequest.create({
      user_id: currentUser.user_id,
      changes,
      status: 'pending'
    });

    const actorLabel = req.user.name ? `Nhân viên ${req.user.name}` : 'Nhân viên';

    await createAdminNotification({
      type: 'profile_update',
      title: 'Yêu cầu cập nhật hồ sơ',
      message: `${actorLabel} gửi yêu cầu cập nhật thông tin cá nhân`,
      metadata: { request_id: request.request_id },
      entityType: 'profile_update_request',
      entityId: request.request_id
    });

    res.status(201).json({
      message: 'Đã gửi yêu cầu cập nhật. Vui lòng chờ phê duyệt từ quản trị.',
      request
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const requests = await ProfileUpdateRequest.findAll({
      where: {
        user_id: req.user.user_id,
        hidden_from_user: false
      },
      order: [['created_at', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await ProfileUpdateRequest.findAll({
      where: { status: 'pending' },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'name', 'email', 'employment_status', 'position']
        }
      ]
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {
      status: { [Op.ne]: 'pending' }
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    where.hidden_from_admin = false;

    const requests = await ProfileUpdateRequest.findAll({
      where,
      order: [['updated_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['user_id', 'name', 'email', 'employment_status', 'position']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['user_id', 'name', 'email']
        }
      ]
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reviewRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ' });
    }

    const request = await ProfileUpdateRequest.findByPk(id, {
      include: [{ model: User, as: 'requester' }]
    });

    if (!request) {
      return res.status(404).json({ message: 'Yêu cầu không tồn tại' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Yêu cầu đã được xử lý trước đó' });
    }

    const recipientUserId = request.user_id;
    if (decision === 'approved') {
      const changes = request.changes || {};

      if (changes.email) {
        const nextEmail = normalizeEmail(changes.email);
        if (!nextEmail) {
          return res.status(400).json({ message: 'Email cập nhật không hợp lệ' });
        }

        const duplicateEmail = await User.findOne({
          where: {
            email: nextEmail,
            user_id: { [Op.ne]: recipientUserId }
          }
        });

        if (duplicateEmail) {
          return res.status(400).json({ message: 'Email đã được sử dụng bởi nhân viên khác' });
        }

        changes.email = nextEmail;
      }

      await request.requester.update(changes);
    }

    await request.update({
      status: decision,
      admin_id: req.user.user_id,
      admin_note: note || null
    });

    await request.reload({
      include: [
        {
          model: User,
          as: 'requester'
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['user_id', 'name', 'email']
        }
      ]
    });

    await markNotificationsReadByEntity('profile_update_request', request.request_id);

    const profileSnapshot = decision === 'approved' ? mapUserProfile(request.requester) : null;

    const notificationTitle = decision === 'approved'
      ? 'Hồ sơ đã được cập nhật'
      : 'Yêu cầu cập nhật hồ sơ bị từ chối';
    const reviewerName = req.user.name || 'Quản trị';
    const notificationMessage = decision === 'approved'
      ? `${reviewerName} đã phê duyệt yêu cầu cập nhật hồ sơ của bạn. Vui lòng kiểm tra thông tin mới.`
      : `${reviewerName} đã từ chối yêu cầu cập nhật hồ sơ của bạn.${note ? ` Ghi chú: ${note}` : ''}`;

    await createUserNotification({
      type: 'profile_update',
      title: notificationTitle,
      message: notificationMessage,
      metadata: {
        request_id: request.request_id,
        decision,
        admin_note: note || null,
        changes: request.changes,
        profile: profileSnapshot
      },
      entityType: 'profile_update_request',
      entityId: request.request_id,
      recipientUserId
    });

    res.json({
      message: 'Đã cập nhật trạng thái yêu cầu',
      request,
      profile: profileSnapshot
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Deletion and clearing history endpoints removed per new requirements.
