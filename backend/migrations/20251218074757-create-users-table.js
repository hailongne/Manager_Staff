'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      username: {
        type: Sequelize.STRING,
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      position: {
        type: Sequelize.STRING,
        allowNull: true
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      department: {
        type: Sequelize.STRING,
        allowNull: true
      },
      department_position: {
        type: Sequelize.STRING,
        allowNull: true
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      date_joined: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      employment_status: {
        type: Sequelize.ENUM('apprentice', 'probation', 'contract', 'official', 'part_time', 'intern', 'resigned'),
        allowNull: true,
        defaultValue: 'probation'
      },
      official_confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      annual_leave_quota: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 12.0
      },
      remaining_leave_days: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 12.0
      },
      work_shift_start: {
        type: Sequelize.TIME,
        allowNull: true
      },
      work_shift_end: {
        type: Sequelize.TIME,
        allowNull: true
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      role: {
        type: Sequelize.ENUM('user', 'admin', 'leader'),
        defaultValue: 'user'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['username'], { unique: true });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};
