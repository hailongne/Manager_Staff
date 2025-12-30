'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('daily_tasks', {
      task_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
      task_type: {
        type: Sequelize.ENUM('kpi', 'daily'),
        allowNull: false,
        defaultValue: 'daily'
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium'
      },
      assigned_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'department_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      chain_kpi_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'chain_kpis',
          key: 'chain_kpi_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('daily_tasks', ['assigned_to']);
    await queryInterface.addIndex('daily_tasks', ['assigned_by']);
    await queryInterface.addIndex('daily_tasks', ['department_id']);
    await queryInterface.addIndex('daily_tasks', ['task_type']);
    await queryInterface.addIndex('daily_tasks', ['status']);
    await queryInterface.addIndex('daily_tasks', ['due_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('daily_tasks');
  }
};