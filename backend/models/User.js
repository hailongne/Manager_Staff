const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EMPLOYMENT_STATUS = ['apprentice', 'probation', 'contract', 'official', 'part_time', 'intern', 'resigned'];
const USER_ROLES = ['user', 'admin', 'leader'];

const User = sequelize.define('User', {
  user_id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  email: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  password: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  username: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  phone: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  position: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  department_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },
  department: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  department_position: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  address: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  date_joined: { 
    type: DataTypes.DATEONLY, 
    allowNull: true 
  },
  employment_status: {
    type: DataTypes.ENUM(...EMPLOYMENT_STATUS),
    allowNull: true,
    defaultValue: 'probation'
  },
  official_confirmed_at: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  annual_leave_quota: { 
    type: DataTypes.DECIMAL(5, 2), 
    allowNull: false, 
    defaultValue: 12.0 
  },
  remaining_leave_days: { 
    type: DataTypes.DECIMAL(5, 2), 
    allowNull: false, 
    defaultValue: 12.0 
  },
  work_shift_start: { 
    type: DataTypes.TIME, 
    allowNull: true 
  },
  work_shift_end: { 
    type: DataTypes.TIME, 
    allowNull: true 
  },
  note: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  role: { 
    type: DataTypes.ENUM(...USER_ROLES), 
    defaultValue: 'user' 
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['email'], name: 'users_email_unique_idx' },
    { unique: true, fields: ['username'], name: 'users_username_unique_idx' }
  ]
});

// Utility: Get current Vietnam time (UTC+7)
const getVietnamNow = () => {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 - now.getTimezoneOffset()) * 60000);
};

const parseTimestamp = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Hooks
User.addHook('beforeCreate', (user) => {
  const incoming = parseTimestamp(user.getDataValue('official_confirmed_at'));
  user.setDataValue('official_confirmed_at', incoming ?? getVietnamNow());
});

User.addHook('beforeUpdate', (user) => {
  if (user.changed('employment_status')) {
    user.setDataValue('official_confirmed_at', getVietnamNow());
  }
});

module.exports = User;
