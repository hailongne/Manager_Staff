/**
 * User Controller
 * Handle HTTP requests for user operations
 */

const userService = require('../services/userService');
const { User } = require('../models');
const { shapeUser } = require('../utils/formatters');
const { parseInteger } = require('../utils/validators');
const { HTTP_STATUS } = require('../utils/constants');
const { createUserNotification } = require('../utils/notificationService');

/**
 * Parse user ID from params
 */
const parseUserId = (value) => parseInteger(value, { min: 1 });

/**
 * Get authenticated user from request
 */
const getAuthUser = async (req) => {
  const { user_id } = req.user || {};
  if (!user_id) return null;
  return User.findByPk(user_id);
};

/**
 * Register new user
 */
exports.register = async (req, res) => {
  try {
    const result = await userService.createUser(req.body);
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Đăng ký thành công',
      user: result.user,
      defaultPassword: result.defaultPassword
    });
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Create user (admin)
 */
exports.createUser = async (req, res) => {
  try {
    const result = await userService.createUser(req.body);
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Tạo tài khoản thành công',
      user: result.user,
      defaultPassword: result.defaultPassword
    });
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Login
 */
exports.login = async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = identifier || email;
    
    const result = await userService.login(loginId, password);
    res.json({
      message: 'Đăng nhập thành công',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Logout
 */
exports.logout = async (req, res) => {
  res.json({ message: 'Đăng xuất thành công' });
};

/**
 * Get current authenticated user
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const { user_id } = req.user || {};
    if (!user_id) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Access denied' });
    }

    const user = await userService.getUserById(user_id);
    res.json(user);
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Get users list
 */
exports.getUsers = async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Access denied' });
    }

    const users = await userService.getUsers(authUser);
    res.json(users);
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Get user by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const userId = parseUserId(req.params.id);
    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'ID không hợp lệ' });
    }

    const authUser = await getAuthUser(req);
    if (!authUser) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Access denied' });
    }

    const user = await userService.getUserById(userId);
    
    // Check access permission
    if (!userService.canAccessUser(authUser, { user_id: userId, department: user.department })) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Permission denied' });
    }

    res.json(user);
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Update user
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = parseUserId(req.params.id);
    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'ID không hợp lệ' });
    }

    const authUser = await getAuthUser(req);
    if (!authUser) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Access denied' });
    }

    const user = await userService.updateUser(userId, req.body, authUser);
    if (authUser.user_id !== userId) {
      const actorName = authUser.name ? `Quản trị ${authUser.name}` : 'Quản trị viên';
      const updatedFields = Object.keys(req.body || {}).filter((key) => req.body[key] !== undefined);
      try {
        await createUserNotification({
          type: 'profile_update',
          title: 'Hồ sơ của bạn vừa được điều chỉnh',
          message: `${actorName} đã cập nhật thông tin của bạn. Vui lòng kiểm tra lại dữ liệu cá nhân.`,
          metadata: {
            updated_fields: updatedFields,
            updated_by: authUser.user_id
          },
          entityType: 'user',
          entityId: userId,
          recipientUserId: userId
        });
      } catch (notifyErr) {
        console.error('Không thể gửi thông báo cập nhật nhân viên', notifyErr);
      }
    }

    res.json({ message: 'Cập nhật nhân viên thành công', user });
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Upload CV file and update user's cv_url
 */
exports.uploadCv = async (req, res) => {
  try {
    const userId = parseUserId(req.params.id);
    if (!userId) return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'ID không hợp lệ' });

    const authUser = await getAuthUser(req);
    if (!authUser) return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Access denied' });

    const user = await userService.getUserById(userId);

    // Permission check
    if (!userService.canAccessUser(authUser, { user_id: userId, department: user.department })) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Permission denied' });
    }

    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'No file uploaded' });
    }

    // Build accessible URL for stored file
    const fileName = req.file.filename;
    const filePath = `/uploads/cv/${fileName}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${filePath}`;

    // Persist cv_url to user record directly
    const { User } = require('../models');
    const target = await User.findByPk(userId);
    if (!target) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'User not found' });

    await target.update({ cv_url: fullUrl });

    const fresh = await userService.getUserById(userId);
    res.json({ message: 'CV uploaded', user: fresh, cv_url: fullUrl });
  } catch (err) {
    console.error('uploadCv error', err);
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message || 'Upload failed' });
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Vui lòng nhập đầy đủ thông tin mật khẩu'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Mật khẩu mới và xác nhận không khớp'
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const { user_id } = req.user || {};
    if (!user_id) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Access denied' });
    }

    const user = await userService.changePassword(user_id, currentPassword, newPassword);
    res.json({ message: 'Đổi mật khẩu thành công', user });
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};

/**
 * Delete user
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = parseUserId(req.params.id);
    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'ID không hợp lệ' });
    }

    await userService.deleteUser(userId);
    res.json({ message: 'Đã xóa tài khoản' });
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
  }
};
