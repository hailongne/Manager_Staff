const sequelize = require('./config/db');

async function checkLeaders() {
  try {
    const [results] = await sequelize.query("SELECT user_id, name, role, department_position, department_id FROM users WHERE role IN ('leader', 'admin')");
    console.log('Leaders and Admins:');
    console.log(results);

    const [allUsers] = await sequelize.query("SELECT user_id, name, role, department_position FROM users LIMIT 5");
    console.log('\nSample users:');
    console.log(allUsers);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkLeaders();