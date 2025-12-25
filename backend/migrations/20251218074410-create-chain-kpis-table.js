'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('chain_kpis', {
      chain_kpi_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      chain_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'production_chains',
          key: 'chain_id'
        },
        onDelete: 'CASCADE'
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      month: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      target_value: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      unit_label: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'sản phẩm'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'user_id'
        }
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
    await queryInterface.addIndex('chain_kpis', ['chain_id']);
    await queryInterface.addIndex('chain_kpis', ['chain_id', 'year', 'month'], { unique: true });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('chain_kpis');
  }
};
