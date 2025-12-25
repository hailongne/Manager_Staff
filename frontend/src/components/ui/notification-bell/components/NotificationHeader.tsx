import type { NotificationHeaderProps } from "../types";

export function NotificationHeader({
  onRefresh,
  onClearAll,
  clearing,
  hasNotifications
}: NotificationHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-700">Thông báo</h3>
      <div className="flex items-center gap-2 text-xs">
        <button onClick={onRefresh} className="text-pink-500 hover:text-pink-600">
          Làm mới
        </button>
        {hasNotifications ? (
          <button
            onClick={onClearAll}
            className="text-gray-400 hover:text-pink-500 disabled:text-gray-300"
            disabled={clearing}
          >
            {clearing ? "Đang xóa..." : "Xóa tất cả"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
