const sequelize = require('../config/db');

const run = async () => {
  try {
    console.log('Running migration: add reason column to profile_update_requests');

    const [rows] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'profile_update_requests' AND COLUMN_NAME = 'reason'`
    );

    const exists = Array.isArray(rows) && rows[0] && rows[0].cnt > 0;
    if (exists) {
      console.log('Column reason already exists, skipping');
    } else {
      console.log('Adding column reason');
      await sequelize.query(`ALTER TABLE profile_update_requests ADD COLUMN reason TEXT NULL`);
      console.log('Added reason column.');
    }

    console.log('Migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

run();
