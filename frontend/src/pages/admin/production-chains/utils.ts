// Utility functions for production chains

export const normalizeDepartmentId = (id: number | string): number | null => {
  const numId = typeof id === "string" ? parseInt(id, 10) : id;
  return Number.isFinite(numId) ? numId : null;
};

// Utility functions cho KPI và Assignments
export const formatDateShort = (dateIso: string): string => {
  const date = new Date(dateIso);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit'
  });
};

export const formatDateWithDayOfWeek = (dateIso: string): string => {
  const date = new Date(dateIso);
  const dayOfWeek = date.getDay();
  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dateStr = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit'
  });
  return `${dateStr} (${dayNames[dayOfWeek]})`;
};

export const formatDayOfWeekFirst = (dateIso: string): { dayOfWeek: string; date: string } => {
  const date = new Date(dateIso);
  const dayOfWeek = date.getDay();
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dateStr = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit'
  });
  return {
    dayOfWeek: dayNames[dayOfWeek],
    date: dateStr
  };
};

export const formatDateTime = (dateIso: string): string => {
  const date = new Date(dateIso);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatWeekLabel = (weekIndex: number): string => {
  return `Tuần ${weekIndex + 1}`;
};