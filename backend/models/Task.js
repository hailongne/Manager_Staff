const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TASK_STATUS = ['pending', 'in_progress', 'completed', 'cancelled'];
const PENDING_ACTIONS = ['create', 'update', 'cancel'];

const Task = sequelize.define('Task', {
  task_id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  user_id: { 
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
  status: { 
    type: DataTypes.ENUM(...TASK_STATUS), 
    defaultValue: 'in_progress' 
  },
  created_at: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  updated_at: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  completed_at: { 
    type: DataTypes.DATE 
  },
  date: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  count_actual: { 
    type: DataTypes.INTEGER, 
    allowNull: true, 
    defaultValue: 0 
  },
  cancel_reason: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  result_link: { 
    type: DataTypes.STRING(2048), 
    allowNull: true 
  },
  pending_action: { 
    type: DataTypes.ENUM(...PENDING_ACTIONS), 
    allowNull: true 
  },
  pending_reason: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  pending_changes: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  pending_requested_by: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },
  acknowledged: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  production_chain_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },
  step_order: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  }
}, {
  tableName: 'tasks',
  timestamps: false
});

module.exports = Task;
