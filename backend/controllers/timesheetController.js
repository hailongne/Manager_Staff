const Timesheet = require('../models/Timesheet');
const { Op, fn, col } = require('sequelize');

// Helper: tuần hiện tại
function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // Sun=0, Mon=1...
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23,59,59,999);
  return {
    start_date: monday.toISOString().slice(0,10),
    end_date: sunday.toISOString().slice(0,10)
  };
}

// Helper: tháng hiện tại
function getMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth()+1, 0);
  return {
    start_date: first.toISOString().slice(0,10),
    end_date: last.toISOString().slice(0,10)
  };
}

// User check-in
exports.checkIn = async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0,10);

    // Kiểm tra đã check-in chưa
    const existing = await Timesheet.findOne({ where: { user_id: req.user.user_id, date: today } });
    if (existing) return res.status(400).json({ message: 'Bạn đã check-in hôm nay rồi' });

    const record = await Timesheet.create({
      user_id: req.user.user_id,
      date: today,
      check_in: now
    });

    res.json({ message: 'Check-in thành công', record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// User check-out
exports.checkOut = async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0,10);

    const record = await Timesheet.findOne({ where: { user_id: req.user.user_id, date: today } });
    if (!record) return res.status(404).json({ message: 'Bạn chưa check-in hôm nay' });
    if (record.check_out) return res.status(400).json({ message: 'Bạn đã check-out rồi' });

    record.check_out = now;
    const hours = (now - record.check_in) / (1000*60*60); // ms → giờ
    record.hours_worked = hours.toFixed(2);
    record.overtime_hours = hours > 8 ? (hours - 8).toFixed(2) : 0;
    await record.save();

    res.json({ message: 'Check-out thành công', record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// User xem lịch sử timesheets
exports.getMyTimesheets = async (req, res) => {
  try {
    const records = await Timesheet.findAll({ where: { user_id: req.user.user_id } });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: thống kê tuần
exports.getWeeklyStats = async (req, res) => {
  try {
    const range = getWeekRange();
    const records = await Timesheet.findAll({
      attributes: [
        'user_id',
        [fn('SUM', col('hours_worked')), 'total_hours'],
        [fn('SUM', col('overtime_hours')), 'total_overtime']
      ],
      where: { date: { [Op.between]: [range.start_date, range.end_date] } },
      group: ['user_id'],
      raw: true
    });
    res.json({ range, records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: thống kê tháng
exports.getMonthlyStats = async (req, res) => {
  try {
    const range = getMonthRange();
    const records = await Timesheet.findAll({
      attributes: [
        'user_id',
        [fn('SUM', col('hours_worked')), 'total_hours'],
        [fn('SUM', col('overtime_hours')), 'total_overtime']
      ],
      where: { date: { [Op.between]: [range.start_date, range.end_date] } },
      group: ['user_id'],
      raw: true
    });
    res.json({ range, records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
