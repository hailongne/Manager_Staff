const jwt = require('jsonwebtoken');
const sequelize = require('./config/db');
const User = require('./models/User');
const Department = require('./models/Department');

// Setup associations
const setupAssociations = require('./models/associations/index');
setupAssociations({ User, Department });

// Simulate auth middleware
async function simulateAuth(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  return {
    user_id: user.user_id,
    role: user.role,
    department_position: user.department_position,
    department_id: user.department_id
  };
}

// Test getDailyTasks logic
async function testGetDailyTasks(userId) {
  try {
    const req = { user: await simulateAuth(userId) };
    if (!req.user) {
      console.log('User not found');
      return;
    }

    console.log('Testing user:', req.user);

    // Check if user is admin
    if (req.user.role === 'admin') {
      console.log('User is admin - should have access');
      return;
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

      const normalizedPosition = req.user.department_position ?
        req.user.department_position
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase() : '';

      console.log('Normalized position:', normalizedPosition);

      const isDepartmentHead = req.user.department_position &&
        departmentHeadKeywords.some(keyword => normalizedPosition.includes(keyword));

      console.log('Is department head:', isDepartmentHead);

      if (isDepartmentHead) {
        // Department head can see tasks in their own department
        departmentIds = [req.user.department_id];
        console.log('User is department head, allowing access to their department:', departmentIds);
      } else {
        console.log('User is not a leader or department head, returning 403');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Test with different users
async function runTests() {
  console.log('=== Testing user 4 (Nguyễn Văn Nam - leader) ===');
  await testGetDailyTasks(4);

  console.log('\n=== Testing user 8 (Nguyễn Hoàng Vy - leader + manager) ===');
  await testGetDailyTasks(8);

  console.log('\n=== Testing user 9 (Nguyễn Mai Linh - leader) ===');
  await testGetDailyTasks(9);

  process.exit(0);
}

runTests();