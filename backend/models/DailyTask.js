const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TASK_STATUS = ['PENDING', 'DOING', 'WAITING_CONFIRM', 'COMPLETED', 'BLOCKED', 'CANCELLED'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const DailyTask = sequelize.define('DailyTask', {
  task_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(...TASK_STATUS),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  priority: {
    type: DataTypes.ENUM(...TASK_PRIORITIES),
    allowNull: false,
    defaultValue: 'MEDIUM'
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'department_id'
    }
  },
  related_step_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'production_chain_steps',
      key: 'step_id'
    }
  },
  related_kpi_task_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'kpi_completions',
      key: 'kpi_completion_id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
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
  tableName: 'daily_tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = DailyTask;