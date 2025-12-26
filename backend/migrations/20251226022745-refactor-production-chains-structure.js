'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Xóa các trường không cần thiết khỏi production_chains
    await queryInterface.removeColumn('production_chains', 'start_date');
    await queryInterface.removeColumn('production_chains', 'end_date');
    await queryInterface.removeColumn('production_chains', 'total_kpi');
    await queryInterface.removeColumn('production_chains', 'feedback');
    await queryInterface.removeColumn('production_chains', 'feedback_by');
    await queryInterface.removeColumn('production_chains', 'feedback_at');

    // Tạo bảng production_chain_feedbacks mới
    await queryInterface.createTable('production_chain_feedbacks', {
      feedback_id: {
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
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'user_id'
        }
      },
      sender_role: {
        type: Sequelize.ENUM('leader', 'admin'),
        allowNull: false
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
  },

  async down (queryInterface, Sequelize) {
    // Xóa bảng production_chain_feedbacks
    await queryInterface.dropTable('production_chain_feedbacks');

    // Thêm lại các trường đã xóa (không thể khôi phục dữ liệu)
    await queryInterface.addColumn('production_chains', 'start_date', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('production_chains', 'end_date', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('production_chains', 'total_kpi', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn('production_chains', 'feedback', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('production_chains', 'feedback_by', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('production_chains', 'feedback_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  }
};
