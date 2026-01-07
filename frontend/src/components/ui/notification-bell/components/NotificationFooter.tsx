import type { NotificationFooterProps } from "../types";

export function NotificationFooter({
  onMarkAllRead,
  onClose,
  markingAll,
  unreadCount
}: NotificationFooterProps) {
  return (
    <div className="px-4 py-3 flex items-center justify-between text-xs border-t border-orange-100 bg-white">
      <button
        onClick={onMarkAllRead}
        className="text-orange-600 hover:text-orange-700 disabled:text-gray-300"
        disabled={markingAll || unreadCount === 0}
      >
        {markingAll ? "Đang cập nhật..." : "Đánh dấu tất cả đã đọc"}
      </button>
      <button onClick={onClose} className="text-gray-500 hover:text-orange-600">
        Đóng
      </button>
    </div>
  );
}
