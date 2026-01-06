const sequelize = require('../config/db');

const CHECK_SQL = "SHOW COLUMNS FROM notifications LIKE 'recipient_role'";
const ALTER_SQL = "ALTER TABLE notifications MODIFY COLUMN recipient_role ENUM('admin','user','leader') NOT NULL DEFAULT 'admin'";

(async () => {
  try {
    console.log('Running migration: add leader recipient role to notifications');
    const [rows] = await sequelize.query(CHECK_SQL);
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('recipient_role column not found on notifications table');
    }

    const currentType = (rows[0].Type || '').toLowerCase();
    if (currentType.includes("'leader'")) {
      console.log('recipient_role already includes leader. Skipping.');
      process.exit(0);
      return;
    }

    await sequelize.query(ALTER_SQL);
    console.log('recipient_role column updated to support leader role.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
