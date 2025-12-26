'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('chain_kpis', 'start_date', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('chain_kpis', 'end_date', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('chain_kpis', 'start_date');
    await queryInterface.removeColumn('chain_kpis', 'end_date');
  }
};
