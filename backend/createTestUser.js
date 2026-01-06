const bcrypt = require('bcryptjs');
const User = require('./models/User');
const sequelize = require('./config/db');

async function createTestUser() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Check if user already exists
    const existingUser = await User.findByPk(1);
    if (existingUser) {
      console.log('Test user already exists');
      return;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = await User.create({
      user_id: 1, // Explicitly set ID
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser',
      password: hashedPassword,
      role: 'user',
      department_id: 1,
      department: 'IT',
      department_position: 'Developer',
      employment_status: 'official'
    });

    console.log('Test user created:', testUser.user_id);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await sequelize.close();
  }
}

createTestUser();
