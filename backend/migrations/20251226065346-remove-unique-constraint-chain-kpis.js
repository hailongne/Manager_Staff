'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Remove the unique index on chain_id, year, month
    await queryInterface.removeIndex('chain_kpis', 'chain_kpis_chain_id_year_month');
  },

  async down (queryInterface, Sequelize) {
    // Add back the unique index
    await queryInterface.addIndex('chain_kpis', ['chain_id', 'year', 'month'], { unique: true });
  }
};
