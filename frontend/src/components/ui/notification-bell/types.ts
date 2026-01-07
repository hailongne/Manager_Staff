import type { Notification } from "../../../api/notifications";

export type TabKey = "all" | "unread" | "tasks";

export interface NotificationSection {
  label: string;
  items: Notification[];
}

export interface TabConfig {
  key: TabKey;
  label: string;
  showDot: boolean;
}

export interface NotificationTabsProps {
  tabs: TabConfig[];
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export interface NotificationHeaderProps {
  onRefresh: () => void;
  onClearAll: () => void;
  clearing: boolean;
  hasNotifications: boolean;
}

export interface NotificationFooterProps {
  onMarkAllRead: () => void;
  onClose: () => void;
  markingAll: boolean;
  unreadCount: number;
}

export interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (notification: Notification, navigateAfter?: boolean) => void;
  onDelete: (id: number) => void;
  onAcknowledge: (notification: Notification) => void;
  deletingId: number | null;
  acknowledgingId: number | null;
  error: string | null;
}

export interface NotificationListProps {
  loading: boolean;
  sections: NotificationSection[];
  emptyMessage: string;
  onMarkRead: (notification: Notification, navigateAfter?: boolean) => void;
  onDelete: (id: number) => void;
  onAcknowledge: (notification: Notification) => void;
  deletingId: number | null;
  acknowledgingId: number | null;
  error: string | null;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export type { Notification };
