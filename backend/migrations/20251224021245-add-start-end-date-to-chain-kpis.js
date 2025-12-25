'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // No changes needed - start_date and end_date will be fetched from production_chains
  },

  async down (queryInterface, Sequelize) {
    // No changes needed
  }
};
