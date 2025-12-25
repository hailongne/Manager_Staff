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
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  target_value: {
    type: DataTypes.INTEGER,
    allowNull: false
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
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user',
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