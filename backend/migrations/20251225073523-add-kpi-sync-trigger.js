'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create trigger to sync production_chains.total_kpi with sum of chain_kpis.target_value
    // For MySQL, we need to create the trigger directly
    await queryInterface.sequelize.query(`
      CREATE TRIGGER sync_production_chain_total_kpi_after_insert
      AFTER INSERT ON chain_kpis
      FOR EACH ROW
      BEGIN
        UPDATE production_chains
        SET total_kpi = (
          SELECT COALESCE(SUM(target_value), 0)
          FROM chain_kpis
          WHERE chain_id = NEW.chain_id
        )
        WHERE chain_id = NEW.chain_id;
      END;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER sync_production_chain_total_kpi_after_update
      AFTER UPDATE ON chain_kpis
      FOR EACH ROW
      BEGIN
        UPDATE production_chains
        SET total_kpi = (
          SELECT COALESCE(SUM(target_value), 0)
          FROM chain_kpis
          WHERE chain_id = NEW.chain_id
        )
        WHERE chain_id = NEW.chain_id;
      END;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER sync_production_chain_total_kpi_after_delete
      AFTER DELETE ON chain_kpis
      FOR EACH ROW
      BEGIN
        UPDATE production_chains
        SET total_kpi = (
          SELECT COALESCE(SUM(target_value), 0)
          FROM chain_kpis
          WHERE chain_id = OLD.chain_id
        )
        WHERE chain_id = OLD.chain_id;
      END;
    `);
  },

  async down (queryInterface, Sequelize) {
    // Drop triggers
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS sync_production_chain_total_kpi_after_insert;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS sync_production_chain_total_kpi_after_update;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS sync_production_chain_total_kpi_after_delete;
    `);
  }
};
