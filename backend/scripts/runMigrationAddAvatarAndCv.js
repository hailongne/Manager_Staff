const sequelize = require('../config/db');

const run = async () => {
  try {
    console.log('Running migration: add avatar_url and cv_url to users');

    const [avatarRows] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'`
    );
    const avatarExists = (avatarRows && avatarRows[0] && avatarRows[0].cnt) > 0;
    if (!avatarExists) {
      console.log('Adding column avatar_url');
      await sequelize.query(`ALTER TABLE users ADD COLUMN avatar_url VARCHAR(1024) NULL`);
    } else {
      console.log('Column avatar_url already exists, skipping');
    }

    const [cvRows] = await sequelize.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'cv_url'`
    );
    const cvExists = (cvRows && cvRows[0] && cvRows[0].cnt) > 0;
    if (!cvExists) {
      console.log('Adding column cv_url');
      await sequelize.query(`ALTER TABLE users ADD COLUMN cv_url VARCHAR(1024) NULL`);
    } else {
      console.log('Column cv_url already exists, skipping');
    }

    console.log('Migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

run();
