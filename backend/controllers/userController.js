/**
 * User Controller
 * Handle HTTP requests for user operations
 */

const userService = require('../services/userService');
const { User } = require('../models');
const { shapeUser } = require('../utils/formatters');
const { parseInteger } = require('../utils/validators');
const { HTTP_STATUS } = require('../utils/constants');

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
    res.json({ message: 'Cập nhật nhân viên thành công', user });
  } catch (err) {
    const status = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).json({ message: err.message });
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
