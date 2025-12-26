'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('production_chain_steps', 'description');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('production_chain_steps', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  }
};
