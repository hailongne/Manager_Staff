exports.calculateTaskCompletionRate = (tasks) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  return total === 0 ? 0 : Math.round((completed / total) * 100);
};

exports.calculateHabitRate = (habit) => {
  return habit.count_target === 0 ? 0 : Math.round((habit.count_actual / habit.count_target) * 100);
};

exports.calculateEfficiency = (tasksCompleted, hoursWorked) => {
  return hoursWorked === 0 ? 0 : (tasksCompleted / hoursWorked).toFixed(2);
};
