const { Op } = require('sequelize');
const Task = require('../models/Task');
const { createUserNotification } = require('../utils/notificationService');

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let reminderState = {
  dateKey: null,
  stages: {
    first: false,
    second: false
  }
};

const resetReminderState = (dateKey = null) => {
  reminderState = {
    dateKey,
    stages: {
      first: false,
      second: false
    }
  };
};

const toVietnamTime = (date = new Date()) => {
  const localeString = date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
  return new Date(localeString);
};

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildReminderMessage = (count, sampleTitles = [], stage = 'first') => {
  if (count === 0) return '';
  const prefix = `Bạn còn ${count} nhiệm vụ chưa hoàn thành cho hôm nay.`;
  const formattedTitles = sampleTitles.length
    ? ` Ví dụ: ${sampleTitles.map((title) => `"${title}"`).join(', ')}.`
    : '';
  const deadlineText = stage === 'second'
    ? ' Vui lòng hoàn tất ngay để kịp trước 17h30.'
    : ' Vui lòng cập nhật trước 17h.';

  return `${prefix}${formattedTitles}${deadlineText}`;
};

const determineReminderStage = (hour, minute) => {
  const inFirstWindow = (hour === 16 && minute >= 45) || (hour === 17 && minute < 15);
  if (inFirstWindow) return 'first';
  const inSecondWindow = hour === 17 && minute >= 20 && minute < 40;
  if (inSecondWindow) return 'second';
  return null;
};

const runReminder = async () => {
  const vietnamNow = toVietnamTime();
  const hour = vietnamNow.getHours();
  const minute = vietnamNow.getMinutes();
  const dateKey = getDateKey(vietnamNow);

  const stage = determineReminderStage(hour, minute);
  if (!stage) {
    if (hour >= 0 && hour < 8) {
      resetReminderState(null); // reset window for new day
    }
    return;
  }

  if (reminderState.dateKey !== dateKey) {
    resetReminderState(dateKey);
  }

  if (reminderState.stages[stage]) {
    return;
  }

  const startOfDay = new Date(vietnamNow);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(vietnamNow);
  endOfDay.setHours(23, 59, 59, 999);

  const pendingTasks = await Task.findAll({
    where: {
      status: { [Op.notIn]: ['completed', 'cancelled'] },
      date: { [Op.gte]: startOfDay, [Op.lte]: endOfDay }
    },
    attributes: ['task_id', 'user_id', 'title', 'date']
  });

  if (!pendingTasks.length) {
    reminderState.stages[stage] = true;
    return;
  }

  const grouped = pendingTasks.reduce((acc, task) => {
    const key = task.user_id;
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    acc.get(key).push(task);
    return acc;
  }, new Map());

  for (const [userId, tasks] of grouped.entries()) {
    if (!userId || !tasks.length) continue;
    const sampleTitles = tasks.slice(0, 3).map((task) => task.title);
    const message = buildReminderMessage(tasks.length, sampleTitles, stage);
    if (!message) continue;

    try {
      await createUserNotification({
        type: 'task',
        title: stage === 'second' ? 'Nhắc nhở gấp hoàn thành nhiệm vụ' : 'Nhắc nhở hoàn thành nhiệm vụ',
        message,
        metadata: {
          task_ids: tasks.map((task) => task.task_id),
          count: tasks.length,
          date: startOfDay,
          reminder_stage: stage
        },
        entityType: 'task',
        entityId: null,
        recipientUserId: userId
      });
    } catch (error) {
      console.error('Failed to create task reminder notification:', error);
    }
  }

  reminderState.stages[stage] = true;
};

const scheduleTaskReminderJob = () => {
  runReminder().catch((error) => {
    console.error('Task reminder initial run failed:', error);
  });

  setInterval(() => {
    runReminder().catch((error) => {
      console.error('Task reminder job failed:', error);
    });
  }, CHECK_INTERVAL_MS);
};

module.exports = { scheduleTaskReminderJob };
