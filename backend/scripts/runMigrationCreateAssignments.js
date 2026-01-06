const sequelize = require('../config/db');

const sql = `
CREATE TABLE IF NOT EXISTS chain_kpi_assignments (
  assignment_id INT AUTO_INCREMENT PRIMARY KEY,
  chain_kpi_id INT NOT NULL,
  week_index INT NOT NULL,
  step_id INT NOT NULL,
  assigned_to INT,
  day_assignments JSON,
  handed_over BOOLEAN NOT NULL DEFAULT false,
  handed_over_by INT,
  handed_over_at DATETIME NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

(async () => {
  try {
    console.log('Running migration: create chain_kpi_assignments');
    await sequelize.query(sql);
    console.log('Migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
