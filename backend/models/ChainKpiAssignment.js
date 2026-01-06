const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChainKpiAssignment = sequelize.define('ChainKpiAssignment', {
  assignment_id: {
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
  week_index: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  step_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  day_assignments: {
    type: DataTypes.JSON,
    allowNull: true
  },
  day_results: {
    type: DataTypes.JSON,
    allowNull: true
  },
  day_titles: {
    type: DataTypes.JSON,
    allowNull: true
  },
  accepted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  accepted_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  handed_over: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  handed_over_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  handed_over_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'chain_kpi_assignments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ChainKpiAssignment;
