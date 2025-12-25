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
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sender_role: {
    type: DataTypes.ENUM('leader', 'admin'),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'production_chain_feedbacks',
  timestamps: false
});

module.exports = ProductionChainFeedback;