'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameTable('user', 'users');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameTable('users', 'user');
  }
};
