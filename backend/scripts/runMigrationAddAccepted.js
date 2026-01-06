const sequelize = require('../config/db');

const checkSql = `
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chain_kpi_assignments' AND COLUMN_NAME = 'accepted';
`;

(async () => {
  try {
    console.log('Running migration: add accepted columns to chain_kpi_assignments');
    const [rows] = await sequelize.query(checkSql);
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Column accepted already exists, skipping.');
    } else {
      await sequelize.query("ALTER TABLE chain_kpi_assignments ADD COLUMN accepted BOOLEAN NOT NULL DEFAULT FALSE");
      await sequelize.query('ALTER TABLE chain_kpi_assignments ADD COLUMN accepted_by INT NULL');
      await sequelize.query("ALTER TABLE chain_kpi_assignments ADD COLUMN accepted_at DATETIME NULL");
      console.log('Added accepted columns.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
