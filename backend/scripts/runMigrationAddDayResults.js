const sequelize = require('../config/db');

const checkSql = `
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chain_kpi_assignments' AND COLUMN_NAME = 'day_results';
`;

(async () => {
  try {
    console.log('Running migration: add day_results to chain_kpi_assignments');
    const [rows] = await sequelize.query(checkSql);
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Column day_results already exists, skipping.');
      process.exit(0);
    }

    await sequelize.query('ALTER TABLE chain_kpi_assignments ADD COLUMN day_results JSON NULL');
    console.log('Migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
