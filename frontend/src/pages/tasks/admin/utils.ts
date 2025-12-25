import type { ApiUser, Task, TaskStats } from "./types";

// Re-export shared utils
export { getWeekRange, getWeekLabel, sortTasks, formatTaskDate } from "../shared/utils";

/**
 * Filter out admin users from user list
 */
export function filterNonAdminUsers(items: ApiUser[]): ApiUser[] {
  return items.filter((item) => item.role !== "admin");
}

/**
 * Calculate task statistics
 */
export function calculateTaskStats(tasks: Task[]): TaskStats {
  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const activeTasks = tasks.filter((task) => task.status !== "pending");
  const inProgress = activeTasks.filter((task) => task.status === "in_progress").length;
  const completed = activeTasks.filter((task) => task.status === "completed").length;
  const cancelled = activeTasks.filter((task) => task.status === "cancelled").length;

  return {
    total: activeTasks.length,
    pending: pendingTasks.length,
    in_progress: inProgress,
    completed,
    cancelled
  };
}

/**
 * Create user map from user array
 */
export function createUserMap(users: ApiUser[]): Map<string, ApiUser> {
  const map = new Map<string, ApiUser>();
  users.forEach((item) => {
    map.set(String(item.user_id), item);
  });
  return map;
}

/**
 * Get active users (not resigned)
 */
export function getActiveUsers(users: ApiUser[]): ApiUser[] {
  return users.filter((item) => (item.employment_status ?? "") !== "resigned");
}

/**
 * Get resigned users
 */
export function getResignedUsers(users: ApiUser[]): ApiUser[] {
  return users.filter((item) => item.employment_status === "resigned");
}

/**
 * Get status display text
 */
export function getStatusLabel(status: Task["status"]): string {
  switch (status) {
    case "completed":
      return "Hoàn thành";
    case "in_progress":
      return "Đang làm";
    case "cancelled":
      return "Hủy";
    case "pending":
    default:
      return "Chờ duyệt";
  }
}

/**
 * Get status badge class
 */
export function getStatusBadgeClass(status: Task["status"]): string {
  switch (status) {
    case "completed":
      return "bg-pink-100 text-pink-700";
    case "in_progress":
      return "bg-yellow-100 text-yellow-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Get pending action label
 */
export function getPendingActionLabel(action: string | undefined): string {
  switch (action) {
    case "cancel":
      return "Yêu cầu hủy";
    case "update":
      return "Yêu cầu cập nhật";
    default:
      return "Yêu cầu tạo mới";
  }
}

/**
 * Change field labels for pending changes
 */
export const CHANGE_LABELS: Record<string, string> = {
  title: "Tiêu đề mới",
  description: "Mô tả mới",
  result_link: "Link kết quả mới",
  status: "Trạng thái đề xuất",
  cancel_reason: "Lý do hủy đề xuất",
  date: "Ngày thực hiện đề xuất"
};

/**
 * Week offset options
 */
export const WEEK_OFFSET_OPTIONS = [1, 0, -1, -2, -3, -4] as const;
