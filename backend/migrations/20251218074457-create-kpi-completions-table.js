'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('kpi_completions', {
      kpi_completion_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      chain_kpi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'chain_kpis',
          key: 'chain_kpi_id'
        },
        onDelete: 'CASCADE'
      },
      completion_type: {
        type: Sequelize.ENUM('week', 'day'),
        allowNull: false
      },
      week_index: {
        type: Sequelize.INTEGER,
        allowNull: true // null for day completions
      },
      date_iso: {
        type: Sequelize.DATEONLY, // YYYY-MM-DD format
        allowNull: true // null for week completions
      },
      completed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'user_id'
        }
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('kpi_completions', ['chain_kpi_id'], {
      name: 'kpi_completions_chain_kpi_id_idx'
    });
    await queryInterface.addIndex('kpi_completions', ['chain_kpi_id', 'completion_type', 'week_index'], {
      unique: true,
      name: 'kpi_completions_week_unique'
    });
    await queryInterface.addIndex('kpi_completions', ['chain_kpi_id', 'completion_type', 'date_iso'], {
      unique: true,
      name: 'kpi_completions_day_unique'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('kpi_completions');
  }
};
