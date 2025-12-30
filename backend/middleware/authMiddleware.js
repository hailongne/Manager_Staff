const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  const authHeader = req.header('authorization') || req.header('Authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the full user data from database to ensure we have latest department_position
    const user = await User.findByPk(verified.user_id);
    if (!user) {
      console.log('User from JWT not found in database:', verified.user_id);
      return res.status(401).json({ message: 'Người dùng không tồn tại, vui lòng đăng nhập lại' });
    }

    req.user = {
      user_id: user.user_id,
      role: user.role,
      department_position: user.department_position,
      department_id: user.department_id
    };

    next();
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn' });
    }
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};
