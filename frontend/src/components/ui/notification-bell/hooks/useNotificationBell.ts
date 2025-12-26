import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearNotifications,
  type Notification
} from "../../../../api/notifications";
import { useAuth } from "../../../../hooks/useAuth";
import type { TabKey, TabConfig } from "../types";
import {
  REFRESH_INTERVAL,
  groupNotificationsByDate,
  filterNotificationsByTab,
  getEmptyMessage
} from "../utils";

export function useNotificationBell() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.status === "unread").length,
    [notifications]
  );

  const taskUnreadCount = useMemo(
    () => notifications.filter((item) => item.type === "task" && item.status === "unread").length,
    [notifications]
  );

  const filteredNotifications = useMemo(
    () => filterNotificationsByTab(notifications, activeTab),
    [notifications, activeTab]
  );

  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(filteredNotifications),
    [filteredNotifications]
  );

  const emptyMessage = useMemo(() => getEmptyMessage(activeTab), [activeTab]);

  const tabConfigs = useMemo<TabConfig[]>(
    () => [
      { key: "all", label: "Tất cả", showDot: false },
      { key: "unread", label: "Chưa đọc", showDot: false },
      { key: "tasks", label: "Nhiệm vụ", showDot: taskUnreadCount > 0 }
    ],
    [taskUnreadCount]
  );

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
      setError(null);

      const hasApprovedProfileUpdate = data.some((item) => {
        if (item.type !== "profile_update" || !item.metadata || typeof item.metadata !== "object") {
          return false;
        }
        const metadata = item.metadata as { decision?: unknown };
        return metadata.decision === "approved";
      });

      if (hasApprovedProfileUpdate) {
        refreshUser().catch((refreshError) => {
          console.error("Refresh user after profile update notification failed", refreshError);
        });
      }
    } catch (err) {
      console.error(err);
      setError("Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  }, [user, refreshUser]);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;

    try {
      setMarkingAll(true);
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => (item.status === "read" ? item : { ...item, status: "read" }))
      );
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Không thể đánh dấu tất cả đã đọc");
    } finally {
      setMarkingAll(false);
    }
  }, [unreadCount]);

  const handleNavigate = useCallback(
    (notification: Notification) => {
      if (!user) return;

      if (notification.entity_type === "profile_update_request") {
        refreshUser()
          .catch((refreshError) => {
            console.error("Refresh user before navigating to profile failed", refreshError);
          })
          .finally(() => {
            navigate(user.role === "admin" ? "/profile-approvals" : "/profile");
          });
        return;
      }

      if (notification.entity_type === "task") {
        navigate("/tasks", { state: { focusTaskId: notification.entity_id } });
        return;
      }
    },
    [user, navigate, refreshUser]
  );

  const handleMarkRead = useCallback(
    async (notification: Notification, navigateAfter = false) => {
      if (notification.status === "unread") {
        try {
          await markNotificationRead(notification.notification_id);
          setNotifications((prev) =>
            prev.map((item) =>
              item.notification_id === notification.notification_id
                ? { ...item, status: "read" }
                : item
            )
          );
        } catch (err) {
          console.error(err);
          setError("Không thể cập nhật trạng thái thông báo");
        }
      }

      if (navigateAfter) {
        handleNavigate(notification);
        setOpen(false);
      }
    },
    [handleNavigate]
  );

  const handleDelete = useCallback(async (notificationId: number) => {
    try {
      setDeletingId(notificationId);
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((item) => item.notification_id !== notificationId));
    } catch (err) {
      console.error(err);
      setError("Không thể xóa thông báo");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleAcknowledge = useCallback(async (notification: Notification) => {
    if (!notification.entity_id) return;

    try {
      setAcknowledgingId(notification.notification_id);
      await deleteNotification(notification.notification_id);
      setNotifications((prev) =>
        prev.filter((item) => item.notification_id !== notification.notification_id)
      );
    } catch (err) {
      console.error(err);
      setError("Không thể xác nhận nhiệm vụ");
    } finally {
      setAcknowledgingId(null);
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    try {
      setClearing(true);
      await clearNotifications();
      setNotifications([]);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Không thể xóa lịch sử thông báo");
    } finally {
      setClearing(false);
    }
  }, []);

  const toggleOpen = useCallback(() => setOpen((prev) => !prev), []);
  const closeDropdown = useCallback(() => setOpen(false), []);

  // Initial fetch and interval
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    fetchNotifications().catch(console.error);
    const interval = window.setInterval(() => {
      fetchNotifications().catch(console.error);
    }, REFRESH_INTERVAL);

    return () => window.clearInterval(interval);
  }, [user, fetchNotifications]);

  // Click outside and escape key
  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  // Refresh on open
  useEffect(() => {
    if (!open) return;
    fetchNotifications().catch(console.error);
  }, [open, fetchNotifications]);

  // Visibility change
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications().catch(console.error);
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, fetchNotifications]);

  return {
    user,
    containerRef,
    open,
    loading,
    error,
    clearing,
    deletingId,
    markingAll,
    acknowledgingId,
    activeTab,
    setActiveTab,
    unreadCount,
    notifications,
    groupedNotifications,
    emptyMessage,
    tabConfigs,
    toggleOpen,
    closeDropdown,
    fetchNotifications,
    handleMarkAllRead,
    handleMarkRead,
    handleDelete,
    handleAcknowledge,
    handleClearAll
  };
}
