const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductionChain = sequelize.define('ProductionChain', {
  chain_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  total_kpi: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  feedback_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  feedback_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'production_chains',
  timestamps: false
});

module.exports = ProductionChain;