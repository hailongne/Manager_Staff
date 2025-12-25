module.exports = function (roles) {
  // Support both single role string and array of roles
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    // Check if user has one of the allowed roles
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // Special case: check if 'department_head' is allowed and user is a department head
    if (allowedRoles.includes('department_head') && isDepartmentHead(req.user)) {
      return next();
    }

    // Special case: check if 'leader' is allowed and user is a leader
    if (allowedRoles.includes('leader') && isDepartmentHead(req.user)) {
      return next();
    }

    return res.status(403).json({ message: 'Permission denied' });
  };
};

// Helper function to check if user is a department head based on position
function isDepartmentHead(user) {
  if (!user.department_position) return false;

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

  const normalized = user.department_position
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return departmentHeadKeywords.some(keyword => normalized.includes(keyword));
}
