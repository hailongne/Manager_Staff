import type { Task } from "../../../api/tasks";

const pad = (value: number) => String(value).padStart(2, "0");

export const getWeekRange = (offset: number = 0) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  const formatDatePart = (date: Date) => {
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatDatePart(monday),
    end: formatDatePart(friday)
  };
};

export const getWeekDates = (offset: number = 0) => {
  const range = getWeekRange(offset);
  const [year, month, day] = range.start.split("-").map(Number);
  const monday = new Date(year, month - 1, day);
  const dates: Date[] = [];

  for (let index = 0; index < 5; index += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    dates.push(date);
  }

  return dates;
};

export const getWeekLabel = (offset: number) => {
  const range = getWeekRange(offset);
  const startDate = new Date(range.start);
  const endDate = new Date(range.end);

  if (offset === 0) {
    return "Tuần này";
  }
  if (offset === -1) {
    return `Tuần trước (${startDate.toLocaleDateString("vi-VN", { month: "2-digit", day: "2-digit" })})`;
  }

  return `${startDate.toLocaleDateString("vi-VN", { month: "2-digit", day: "2-digit" })} - ${endDate.toLocaleDateString("vi-VN", { month: "2-digit", day: "2-digit" })}`;
};

export const sortTasks = (items: Task[]) => {
  return [...items].sort((a, b) => {
    if (a.status === "cancelled" && b.status !== "cancelled") return 1;
    if (a.status !== "cancelled" && b.status === "cancelled") return -1;
    return b.task_id - a.task_id;
  });
};

export const formatTaskDate = (dateString: string | undefined) => {
  if (!dateString) return "Chưa có";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

export const getMonthRange = (year: number, month: number) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
  };
};

export const sortTasksByDateAsc = (items: Task[]) => {
  return [...items].sort((a, b) => {
    const parseDate = (task: Task) => {
      if (!task.date) return Number.POSITIVE_INFINITY;
      const dateValue = new Date(task.date).getTime();
      return Number.isNaN(dateValue) ? Number.POSITIVE_INFINITY : dateValue;
    };

    const aDate = parseDate(a);
    const bDate = parseDate(b);

    if (aDate !== bDate) return aDate - bDate;
    return b.task_id - a.task_id;
  });
};

export const formatDateRange = (startDate?: string | null, endDate?: string | null) => {
  if (!startDate) return "Chưa có";
  const start = new Date(startDate);
  const startLabel = start.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });

  if (!endDate) return startLabel;
  const end = new Date(endDate);
  const endLabel = end.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${startLabel} - ${endLabel}`;
};
