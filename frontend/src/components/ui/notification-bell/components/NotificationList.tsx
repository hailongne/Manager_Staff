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
  error,
  activeTab,
  onTabChange
}: NotificationListProps) {
  if (loading) {
    return <div className="p-6 text-center text-sm text-gray-500">Đang tải thông báo...</div>;
  }

  if (sections.length === 0) {
    return (
      <>
        <div className="p-4 border-b border-gray-100 last:border-none">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Hôm nay</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTabChange('all')}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  activeTab === 'all' ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 border border-orange-100 hover:bg-orange-50'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => onTabChange('unread')}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  activeTab === 'unread' ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 border border-orange-100 hover:bg-orange-50'
                }`}
              >
                Chưa đọc
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 text-center text-sm text-gray-500">{emptyMessage}</div>
      </>
    );
  }

  return (
    <>
      {sections.map((section) => (
        <div key={section.label} className="p-4 border-b border-gray-100 last:border-none">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{section.label}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTabChange('all')}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  activeTab === 'all' ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 border border-orange-100 hover:bg-orange-50'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => onTabChange('unread')}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  activeTab === 'unread' ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 border border-orange-100 hover:bg-orange-50'
                }`}
              >
                Chưa đọc
              </button>
            </div>
          </div>
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
