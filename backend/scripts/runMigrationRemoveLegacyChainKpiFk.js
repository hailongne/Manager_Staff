const sequelize = require('../config/db');

const constraintName = 'chain_kpis_ibfk_16';
const checkSql = `
SELECT CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'chain_kpis'
  AND CONSTRAINT_NAME = '${constraintName}'
`;

(async () => {
  try {
    console.log('Running migration: remove legacy constraint chain_kpis_ibfk_16');
    const [rows] = await sequelize.query(checkSql);
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('Constraint already removed, skipping.');
      process.exit(0);
    }

    await sequelize.query(`ALTER TABLE chain_kpis DROP FOREIGN KEY ${constraintName}`);
    console.log('Dropped constraint chain_kpis_ibfk_16.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
