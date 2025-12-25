const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const NOTIFICATION_TYPES = [
  'profile_update',
  'task',
  'chain_kpi',
  'chain_assignment',
  'assignment_confirmed',
  'kpi_confirmed',
  'test'
];
const NOTIFICATION_STATUS = ['unread', 'read'];
const RECIPIENT_ROLES = ['admin', 'user'];

const Notification = sequelize.define('Notification', {
  notification_id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  type: {
    type: DataTypes.ENUM(...NOTIFICATION_TYPES),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(...NOTIFICATION_STATUS),
    allowNull: false,
    defaultValue: 'unread'
  },
  recipient_role: {
    type: DataTypes.ENUM(...RECIPIENT_ROLES),
    allowNull: false,
    defaultValue: 'admin'
  },
  recipient_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  entity_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Notification;
