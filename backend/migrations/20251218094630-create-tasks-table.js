'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('tasks', {
      task_id: { 
        type: Sequelize.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
      },
      user_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false 
      },
      title: { 
        type: Sequelize.STRING, 
        allowNull: false 
      },
      description: { 
        type: Sequelize.TEXT, 
        allowNull: true 
      },
      status: { 
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'cancelled'), 
        defaultValue: 'in_progress' 
      },
      created_at: { 
        type: Sequelize.DATE, 
        defaultValue: Sequelize.NOW 
      },
      updated_at: { 
        type: Sequelize.DATE, 
        defaultValue: Sequelize.NOW 
      },
      completed_at: { 
        type: Sequelize.DATE 
      },
      date: { 
        type: Sequelize.DATE, 
        allowNull: true 
      },
      count_actual: { 
        type: Sequelize.INTEGER, 
        allowNull: true, 
        defaultValue: 0 
      },
      cancel_reason: { 
        type: Sequelize.TEXT, 
        allowNull: true 
      },
      result_link: { 
        type: Sequelize.STRING(2048), 
        allowNull: true 
      },
      pending_action: { 
        type: Sequelize.ENUM('create', 'update', 'cancel'), 
        allowNull: true 
      },
      pending_reason: { 
        type: Sequelize.TEXT, 
        allowNull: true 
      },
      pending_changes: { 
        type: Sequelize.JSON, 
        allowNull: true 
      },
      pending_requested_by: { 
        type: Sequelize.INTEGER, 
        allowNull: true 
      },
      acknowledged: { 
        type: Sequelize.BOOLEAN, 
        defaultValue: false 
      },
      production_chain_id: { 
        type: Sequelize.INTEGER, 
        allowNull: true 
      },
      step_order: { 
        type: Sequelize.INTEGER, 
        allowNull: true 
      }
    });

    // Add indexes
    await queryInterface.addIndex('tasks', ['user_id']);
    await queryInterface.addIndex('tasks', ['status']);
    await queryInterface.addIndex('tasks', ['date']);
    await queryInterface.addIndex('tasks', ['production_chain_id']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('tasks');
  }
};
