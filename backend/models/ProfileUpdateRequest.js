const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const REQUEST_STATUS = ['pending', 'approved', 'rejected'];

const ProfileUpdateRequest = sequelize.define('ProfileUpdateRequest', {
  request_id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  user_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  changes: { 
    type: DataTypes.JSON, 
    allowNull: false 
  },
  status: {
    type: DataTypes.ENUM(...REQUEST_STATUS),
    allowNull: false,
    defaultValue: 'pending'
  },
  admin_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },
  admin_note: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  hidden_from_admin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  hidden_from_user: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'profile_update_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ProfileUpdateRequest;
