const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductionChainFeedback = sequelize.define('ProductionChainFeedback', {
  feedback_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  chain_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'production_chains',
      key: 'chain_id'
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user',
      key: 'user_id'
    }
  },
  sender_role: {
    type: DataTypes.ENUM('leader', 'admin'),
    allowNull: false
  }
}, {
  tableName: 'production_chain_feedbacks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ProductionChainFeedback;