const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChainKpi = sequelize.define('ChainKpi', {
  chain_kpi_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chain_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'production_chains',
      key: 'chain_id'
    }
  },
  target_value: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  unit_label: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'sản phẩm'
  },
  weeks: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  is_accumulated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  accumulated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  }
}, {
  tableName: 'chain_kpis',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ChainKpi;