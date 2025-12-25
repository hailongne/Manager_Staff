const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductionChainStep = sequelize.define('ProductionChainStep', {
  step_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  chain_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  step_order: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // estimated_duration: {
  //   type: DataTypes.INTEGER, // hours
  //   allowNull: true
  // },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'production_chain_steps',
  timestamps: false
});

module.exports = ProductionChainStep;