import type { Notification } from "../../../api/notifications";
import type { NotificationSection, TabKey } from "./types";

export const REFRESH_INTERVAL = 60_000;

/**
 * Convert date to Vietnam timezone
 */
export const toVietnamDate = (input: string | number | Date): Date => {
  const source = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
  const localeString = source.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  return new Date(localeString);
};

/**
 * Format date for display
 */
export const formatNotificationDate = (createdAt: Date): string => {
  return createdAt.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

/**
 * Group notifications by date (today, earlier)
 */
export const groupNotificationsByDate = (
  notifications: Notification[]
): NotificationSection[] => {
  if (!notifications.length) {
    return [];
  }

  const now = toVietnamDate(new Date());
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const buckets: Record<"today" | "yesterday" | "earlier", Notification[]> = {
    today: [],
    yesterday: [],
    earlier: []
  };

  notifications.forEach((notification) => {
    const createdAt = toVietnamDate(notification.created_at);
    if (createdAt >= startOfToday && createdAt < startOfTomorrow) {
      buckets.today.push(notification);
    } else if (createdAt >= startOfYesterday && createdAt < startOfToday) {
      buckets.yesterday.push(notification);
    } else {
      buckets.earlier.push(notification);
    }
  });

  const sections: NotificationSection[] = [];
  if (buckets.today.length) {
    sections.push({ label: "Hôm nay", items: buckets.today });
  }

  const previousItems = [...buckets.yesterday, ...buckets.earlier];
  if (previousItems.length) {
    sections.push({ label: "Trước đó", items: previousItems });
  }

  return sections;
};

/**
 * Filter notifications by tab
 */
export const filterNotificationsByTab = (
  notifications: Notification[],
  activeTab: TabKey
): Notification[] => {
  if (activeTab === "unread") {
    return notifications.filter((item) => item.status === "unread");
  }
  if (activeTab === "tasks") {
    return notifications.filter((item) => item.type === "task");
  }
  return notifications;
};

/**
 * Get empty message based on active tab
 */
export const getEmptyMessage = (activeTab: TabKey): string => {
  if (activeTab === "tasks") {
    return "Chưa có thông báo nhiệm vụ.";
  }
  if (activeTab === "unread") {
    return "Bạn đã đọc hết thông báo.";
  }
  return "Chưa có thông báo nào.";
};

/**
 * Get notification icon based on type
 */
export const getNotificationIcon = (type: Notification["type"]): string => {
  switch (type) {
    case "task":
      return "📝";
    case "profile_update":
      return "🧾";
    case "chain_kpi":
      return "⚙️";
    case "chain_assignment":
      return "📊";
    case "kpi_result":
      return "📮";
    case "kpi_accept":
      return "✅";
    case "assignment_confirmed":
      return "📌";
    case "kpi_confirmed":
      return "🏁";
    case "test":
      return "🧪";
    default:
      return "🔔";
  }
};
