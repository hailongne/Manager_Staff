import api from "./axios";

export interface Notification {
  notification_id: number;
  type: "profile_update" | "task";
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  status: "unread" | "read";
  recipient_role: "admin" | "user";
  recipient_user_id?: number | null;
  entity_type?: string | null;
  entity_id?: number | null;
  created_at: string;
  updated_at: string;
}

export const getNotifications = async (status?: "unread" | "read"): Promise<Notification[]> => {
  const params = status ? { status } : undefined;
  const { data } = await api.get<Notification[]>("/notifications", { params });
  return data;
};

export const markNotificationRead = async (notificationId: number): Promise<{ message: string; notification: Notification }> => {
  const { data } = await api.post(`/notifications/${notificationId}/read`);
  return data;
};

export const markAllNotificationsRead = async (): Promise<{ message: string; updated: number }> => {
  const { data } = await api.post<{ message: string; updated: number }>(`/notifications/mark-all-read`);
  return data;
};

export const deleteNotification = async (notificationId: number): Promise<{ message: string }> => {
  const { data } = await api.delete<{ message: string }>(`/notifications/${notificationId}`);
  return data;
};

export const clearNotifications = async (): Promise<{ message: string; removed: number }> => {
  const { data } = await api.delete<{ message: string; removed: number }>(`/notifications`);
  return data;
};
