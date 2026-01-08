// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const User = require("../models/User");

const sanitizeIdentifier = (value) => {
  if (!value) return null;
  return String(value).trim().toLowerCase();
};

const mapUser = (userInstance) => {
  if (!userInstance) return null;
  const plain = userInstance.get ? userInstance.get({ plain: true }) : userInstance;
  return {
    user_id: plain.user_id,
    name: plain.name,
    email: plain.email,
    username: plain.username,
    role: plain.role,
    phone: plain.phone,
    department_id: plain.department_id,
    department: plain.department,
    department_position: plain.department_position,
    address: plain.address,
    date_joined: plain.date_joined,
    employment_status: plain.employment_status,
    base_salary: plain.base_salary != null ? Number(plain.base_salary) : null,
    annual_leave_quota: plain.annual_leave_quota != null ? Number(plain.annual_leave_quota) : null,
    remaining_leave_days: plain.remaining_leave_days != null ? Number(plain.remaining_leave_days) : null,
    work_shift_start: plain.work_shift_start,
    work_shift_end: plain.work_shift_end,
    note: plain.note,
    created_at: plain.created_at,
    updated_at: plain.updated_at
  };
};

exports.login = async (req, res) => {
  const { identifier, email, password } = req.body;

  console.log('Login attempt:', { identifier, email, password: password ? '***' : null });

  if (!password) {
    return res.status(400).json({ message: "Mật khẩu là bắt buộc" });
  }

  const loginIdentifier = sanitizeIdentifier(identifier || email);
  if (!loginIdentifier) {
    return res.status(400).json({ message: "Vui lòng cung cấp email hoặc tên đăng nhập" });
  }

  try {
    console.log('Finding user with identifier:', loginIdentifier);
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: loginIdentifier }, { username: loginIdentifier }]
      }
    });

    if (!user) {
      console.log('User not found');
      return res.status(400).json({ message: "Tài khoản không tồn tại" });
    }

    console.log('User found:', user.user_id);
    console.log('Comparing passwords');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(400).json({ message: "Sai mật khẩu" });
    }

    console.log('Generating token');
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    console.log('Token generated');

    console.log('Login successful');
    let mappedUser;
    try {
      mappedUser = mapUser(user);
      console.log('User mapped successfully');
    } catch (mapError) {
      console.error('Error mapping user:', mapError);
      throw mapError;
    }
    res.json({
      message: "Đăng nhập thành công",
      token,
      user: mappedUser
    });
    console.log('Response sent');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Server error" });
  }
};
