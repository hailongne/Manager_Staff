import type { NotificationListProps } from "../types";
import { NotificationItem } from "./NotificationItem";

export function NotificationList({
  loading,
  sections,
  emptyMessage,
  onMarkRead,
  onDelete,
  onAcknowledge,
  deletingId,
  acknowledgingId,
  error
}: NotificationListProps) {
  if (loading) {
    return <div className="p-6 text-center text-sm text-gray-500">Đang tải thông báo...</div>;
  }

  if (sections.length === 0) {
    return <div className="p-6 text-center text-sm text-gray-500">{emptyMessage}</div>;
  }

  return (
    <>
      {sections.map((section) => (
        <div key={section.label} className="p-4 border-b border-gray-100 last:border-none">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {section.label}
          </p>
          <ul className="space-y-3">
            {section.items.map((notification) => (
              <NotificationItem
                key={notification.notification_id}
                notification={notification}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
                onAcknowledge={onAcknowledge}
                deletingId={deletingId}
                acknowledgingId={acknowledgingId}
                error={error}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
