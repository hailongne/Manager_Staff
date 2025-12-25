/**
 * User Service
 * Business logic for user operations
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Department } = require('../models');
const { 
  normalizeEmail, 
  normalizeString, 
  normalizeText, 
  slugifyUsername,
  parseDecimal,
  removeDiacritics
} = require('../utils/validators');
const { shapeUser } = require('../utils/formatters');
const { toDateString } = require('../utils/dateHelpers');
const { ERROR_MESSAGES } = require('../utils/constants');

// Constants
const SUPER_ADMIN_ID = 1;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const EMPLOYMENT_STATUS_MAP = {
  apprentice: 'apprentice',
  'học việc': 'apprentice',
  trainee: 'apprentice',
  intern: 'intern',
  internship: 'intern',
  'thực tập': 'intern',
  probation: 'probation',
  'thử việc': 'probation',
  contract: 'contract',
  'hợp đồng': 'contract',
  official: 'official',
  permanent: 'official',
  'chính thức': 'official',
  part_time: 'part_time',
  'part-time': 'part_time',
  'bán thời gian': 'part_time',
  resigned: 'resigned',
  'nghỉ việc': 'resigned'
};

const HEAD_POSITION_KEYWORDS = [
  'truong ban', 'truong phong', 'truong bo phan',
  'head', 'department head', 'team lead', 'lead', 'manager'
];

/**
 * Check if department position indicates leadership role
 */
const isDepartmentHeadPosition = (position) => {
  if (!position) return false;
  const normalized = removeDiacritics(position).toLowerCase();
  return HEAD_POSITION_KEYWORDS.some(keyword => normalized.includes(keyword));
};

/**
 * Resolve employment status from various input formats
 */
const resolveEmploymentStatus = (value) => {
  if (!value) return 'probation';
  const key = String(value).trim().toLowerCase();
  return EMPLOYMENT_STATUS_MAP[key] || 'probation';
};

/**
 * Check if user is department head
 */
const isDepartmentHead = (user) => {
  if (!user) return false;
  const position = user.department_position ?? user.departmentPosition;
  return isDepartmentHeadPosition(position);
};

/**
 * Build role from input
 */
const buildRole = (incomingRole, defaultRole = 'user') => {
  if (!incomingRole) return defaultRole;
  const normalized = String(incomingRole).trim().toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'leader') return 'leader';
  if (normalized === 'user') return 'user';
  return defaultRole;
};

/**
 * Ensure username is unique
 */
const ensureUniqueUsername = async (desired, excludeUserId = null) => {
  let candidate = slugifyUsername(desired);
  if (!candidate) candidate = 'user';

  const whereClause = { username: candidate };
  if (excludeUserId) {
    whereClause.user_id = { [Op.ne]: excludeUserId };
  }

  const existing = await User.findOne({ where: whereClause });
  if (!existing) return candidate;

  let suffix = 1;
  let nextCandidate = `${candidate}${suffix}`;
  while (await User.findOne({ 
    where: { 
      username: nextCandidate,
      ...(excludeUserId ? { user_id: { [Op.ne]: excludeUserId } } : {})
    } 
  })) {
    suffix += 1;
    nextCandidate = `${candidate}${suffix}`;
  }
  return nextCandidate;
};

/**
 * Build user profile payload from request body
 */
const buildProfilePayload = async (body) => {
  const status = resolveEmploymentStatus(
    body.employment_status ?? body.contract_type ?? body.employmentType
  );

  // Resolve department
  let departmentId = body.department_id ?? body.departmentId;
  let departmentName = normalizeString(body.department ?? body.department_name);

  if (departmentId && !departmentName) {
    const dept = await Department.findByPk(departmentId);
    departmentName = dept?.name ?? null;
  }

  const profile = {
    name: normalizeString(body.name),
    email: normalizeEmail(body.email),
    phone: body.phone ?? body.phone_number ?? null,
    position: body.position ?? body.job_title ?? null,
    department_id: departmentName ? departmentId : null,
    department: departmentName,
    address: body.address ?? null,
    date_joined: toDateString(body.date_joined || body.join_date),
    employment_status: status,
    annual_leave_quota: parseDecimal(body.annual_leave_quota ?? body.leave_quota, 12),
    remaining_leave_days: parseDecimal(body.remaining_leave_days ?? body.leave_balance, null),
    work_shift_start: body.work_shift_start ?? null,
    work_shift_end: body.work_shift_end ?? null,
    note: body.note ?? null
  };

  // Department position
  const deptPosition = body.department_position ?? body.departmentRole ?? body.department_title;
  if (deptPosition !== undefined) {
    profile.department_position = normalizeString(deptPosition);
  }

  // Defaults
  if (!profile.date_joined) {
    profile.date_joined = new Date().toISOString().slice(0, 10);
  }
  if (profile.remaining_leave_days == null) {
    profile.remaining_leave_days = profile.annual_leave_quota;
  }

  return profile;
};

class UserService {
  /**
   * Create new user
   */
  async createUser(data, options = {}) {
    const profile = await buildProfilePayload(data);

    // Validate required fields
    if (!profile.name) {
      throw { status: 400, message: 'Tên nhân viên là bắt buộc' };
    }
    if (!profile.email) {
      throw { status: 400, message: 'Email là bắt buộc' };
    }

    // Check email uniqueness
    const existingEmail = await User.findOne({ where: { email: profile.email } });
    if (existingEmail) {
      throw { status: 400, message: ERROR_MESSAGES.EMAIL_EXISTS };
    }

    // Resolve username
    let username;
    if (data.username) {
      const normalized = slugifyUsername(data.username);
      if (!normalized) {
        throw { status: 400, message: 'Tên đăng nhập không hợp lệ' };
      }
      const duplicate = await User.findOne({ where: { username: normalized } });
      if (duplicate) {
        throw { status: 400, message: ERROR_MESSAGES.USERNAME_EXISTS };
      }
      username = normalized;
    } else {
      const fallback = profile.email?.split('@')[0] || profile.name || `user${Date.now()}`;
      username = await ensureUniqueUsername(fallback);
    }

    // Hash password
    const rawPassword = data.password || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Determine role - auto-set to 'leader' if department position indicates leadership
    let userRole = buildRole(data.role, 'user');
    if (profile.department_position && isDepartmentHeadPosition(profile.department_position)) {
      userRole = 'leader';
    }

    // Create user
    const user = await User.create({
      ...profile,
      username,
      password: hashedPassword,
      role: userRole
    });

    return {
      user: shapeUser(user),
      defaultPassword: data.password ? null : rawPassword
    };
  }

  /**
   * Authenticate user
   */
  async login(identifier, password) {
    if (!password) {
      throw { status: 400, message: 'Mật khẩu là bắt buộc' };
    }
    if (!identifier) {
      throw { status: 400, message: 'Vui lòng cung cấp email hoặc tên đăng nhập' };
    }

    const normalized = String(identifier).trim().toLowerCase();
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: normalized }, { username: normalized }]
      }
    });

    if (!user) {
      throw { status: 400, message: 'Tài khoản không tồn tại' };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw { status: 400, message: 'Sai mật khẩu' };
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return { token, user: shapeUser(user) };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      throw { status: 404, message: ERROR_MESSAGES.USER_NOT_FOUND };
    }
    return shapeUser(user);
  }

  /**
   * Get users list based on permissions
   */
  async getUsers(authUser) {
    if (authUser.role === 'admin') {
      const users = await User.findAll({
        attributes: { exclude: ['password'] }
      });
      return users.map(shapeUser);
    }

    const isHead = isDepartmentHead(authUser);
    const authDept = normalizeString(authUser.department);

    if (!isHead || !authDept) {
      return [shapeUser(authUser)];
    }

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { department: authUser.department },
          { user_id: authUser.user_id }
        ]
      },
      attributes: { exclude: ['password'] }
    });

    // Deduplicate
    const seen = new Set();
    return users
      .map(shapeUser)
      .filter(u => {
        if (!u || seen.has(u.user_id)) return false;
        seen.add(u.user_id);
        return true;
      });
  }

  /**
   * Update user
   */
  async updateUser(userId, data, authUser) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw { status: 404, message: ERROR_MESSAGES.USER_NOT_FOUND };
    }

    // Permission checks
    const isAdmin = authUser.role === 'admin';
    const isSelf = authUser.user_id === userId;
    const authIsHead = isDepartmentHead(authUser);
    const authDeptKey = normalizeText(authUser.department);
    const targetDeptKey = normalizeText(user.department);

    const canManage = isAdmin || isSelf || 
      (authIsHead && authDeptKey && authDeptKey === targetDeptKey);

    if (!canManage) {
      throw { status: 403, message: ERROR_MESSAGES.FORBIDDEN };
    }

    // Build update payload
    const profile = await buildProfilePayload(data);
    const updates = { ...profile };

    // Handle username update
    if (data.username) {
      const normalized = slugifyUsername(data.username);
      if (!normalized) {
        throw { status: 400, message: 'Tên đăng nhập không hợp lệ' };
      }
      const duplicate = await User.findOne({
        where: { username: normalized, user_id: { [Op.ne]: userId } }
      });
      if (duplicate) {
        throw { status: 400, message: ERROR_MESSAGES.USERNAME_EXISTS };
      }
      updates.username = normalized;
    }

    // Handle role update (admin only)
    if (Object.prototype.hasOwnProperty.call(data, 'role')) {
      if (!isAdmin) {
        throw { status: 403, message: 'Bạn không có quyền thay đổi vai trò hệ thống' };
      }
      const nextRole = buildRole(data.role, user.role);
      if (user.user_id === SUPER_ADMIN_ID && nextRole !== 'admin') {
        throw { status: 400, message: 'Không thể hạ quyền quản trị viên gốc' };
      }
      updates.role = nextRole;
    } else {
      // Auto-set role based on department position if not explicitly set by admin
      const finalDepartmentPosition = updates.department_position || user.department_position;
      if (finalDepartmentPosition && isDepartmentHeadPosition(finalDepartmentPosition)) {
        updates.role = 'leader';
      } else if (!updates.role && user.role === 'leader') {
        // Reset to user role if no longer a head position and role wasn't explicitly set
        updates.role = 'user';
      }
    }

    // Handle password update
    if (data.password) {
      updates.password = await bcrypt.hash(data.password, 10);
    }

    await user.update(updates);
    
    const fresh = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    return shapeUser(fresh);
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw { status: 404, message: ERROR_MESSAGES.USER_NOT_FOUND };
    }

    const isCurrentValid = await bcrypt.compare(String(currentPassword), user.password);
    if (!isCurrentValid) {
      throw { status: 400, message: 'Mật khẩu hiện tại không chính xác' };
    }

    const isSameAsOld = await bcrypt.compare(String(newPassword), user.password);
    if (isSameAsOld) {
      throw { status: 400, message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại' };
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    await user.update({ password: hashedPassword });

    return shapeUser(user);
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw { status: 404, message: ERROR_MESSAGES.USER_NOT_FOUND };
    }

    if (user.user_id === SUPER_ADMIN_ID) {
      throw { status: 400, message: 'Không thể xóa quản trị viên gốc' };
    }

    if (user.employment_status !== 'resigned') {
      throw { status: 400, message: 'Chỉ xóa nhân viên đã nghỉ việc ít nhất 1 tháng' };
    }

    const lastUpdated = user.updated_at ? new Date(user.updated_at) : null;
    if (!lastUpdated || (Date.now() - lastUpdated.getTime()) < ONE_MONTH_MS) {
      throw { status: 400, message: 'Nhân viên cần ở trạng thái nghỉ việc tối thiểu 30 ngày' };
    }

    await user.destroy();
    return true;
  }

  /**
   * Check if user can access target user data
   */
  canAccessUser(authUser, targetUser) {
    if (authUser.role === 'admin') return true;
    if (authUser.user_id === targetUser.user_id) return true;
    
    const isHead = isDepartmentHead(authUser);
    const authDept = normalizeText(authUser.department);
    const targetDept = normalizeText(targetUser.department);
    
    return isHead && authDept && authDept === targetDept;
  }
}

module.exports = new UserService();
module.exports.isDepartmentHead = isDepartmentHead;
module.exports.buildRole = buildRole;
module.exports.resolveEmploymentStatus = resolveEmploymentStatus;
