const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const KpiCompletion = sequelize.define('KpiCompletion', {
  kpi_completion_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chain_kpi_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'chain_kpis',
      key: 'chain_kpi_id'
    }
  },
  completion_type: {
    type: DataTypes.ENUM('week', 'day'),
    allowNull: false
  },
  week_index: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  date_iso: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  completed_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'kpi_completions',
  timestamps: true,
  createdAt: 'completed_at',
  updatedAt: false
});

module.exports = KpiCompletion;