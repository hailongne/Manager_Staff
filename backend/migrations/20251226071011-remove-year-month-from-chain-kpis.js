'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Remove year and month columns
    await queryInterface.removeColumn('chain_kpis', 'year');
    await queryInterface.removeColumn('chain_kpis', 'month');
  },

  async down (queryInterface, Sequelize) {
    // Add back year and month columns
    await queryInterface.addColumn('chain_kpis', 'year', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    await queryInterface.addColumn('chain_kpis', 'month', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
