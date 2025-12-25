const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ATTENDANCE_STATUS = ['present', 'late', 'absent', 'leave', 'holiday', 'remote'];

const Timesheet = sequelize.define('Timesheet', {
  record_id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  user_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  date: { 
    type: DataTypes.DATEONLY, 
    allowNull: false 
  },
  check_in: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  check_out: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  hours_worked: { 
    type: DataTypes.DECIMAL(5, 2), 
    allowNull: true 
  },
  overtime_hours: { 
    type: DataTypes.DECIMAL(5, 2), 
    allowNull: true 
  },
  attendance_status: {
    type: DataTypes.ENUM(...ATTENDANCE_STATUS),
    allowNull: false,
    defaultValue: 'present'
  },
  leave_request_id: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },
  note: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  }
}, {
  tableName: 'timesheets',
  timestamps: false
});

module.exports = Timesheet;
