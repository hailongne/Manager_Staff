import type { NotificationFooterProps } from "../types";

export function NotificationFooter({
  onMarkAllRead,
  onClose,
  markingAll,
  unreadCount
}: NotificationFooterProps) {
  return (
    <div className="px-4 py-3 flex items-center justify-between text-xs border-t border-gray-100 bg-gray-50">
      <button
        onClick={onMarkAllRead}
        className="text-pink-500 hover:text-pink-600 disabled:text-gray-300"
        disabled={markingAll || unreadCount === 0}
      >
        {markingAll ? "Đang cập nhật..." : "Đánh dấu tất cả đã đọc"}
      </button>
      <button onClick={onClose} className="text-gray-400 hover:text-pink-500">
        Đóng
      </button>
    </div>
  );
}
