import type { NotificationHeaderProps } from "../types";

export function NotificationHeader({
  onRefresh,
  onClearAll,
  clearing,
  hasNotifications
}: NotificationHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-orange-100 flex items-center justify-between bg-white">
      <h3 className="text-sm font-semibold text-gray-800">Thông báo</h3>
      <div className="flex items-center gap-2 text-xs">
        <button onClick={onRefresh} className="text-orange-600 hover:text-orange-700">
          Làm mới
        </button>
        {hasNotifications ? (
          <button
            onClick={onClearAll}
            className="text-gray-400 hover:text-orange-600 disabled:text-gray-300"
            disabled={clearing}
          >
            {clearing ? "Đang xóa..." : "Xóa tất cả"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
