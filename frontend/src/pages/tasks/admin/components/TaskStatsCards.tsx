import type { TaskStatsCardsProps } from "../types";

export function TaskStatsCards({ stats }: TaskStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
        <div className="text-2xl font-bold text-pink-600">{stats.total}</div>
        <div className="text-sm text-gray-600">Tổng nhiệm vụ</div>
        <span className="text-xs text-gray-600">Tổng các nhiệm vụ từ trước đến giờ</span>
      </div>
      <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
        <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
        <div className="text-sm text-gray-600">Chờ duyệt</div>
        <span className="text-xs text-gray-600">Nhiệm vụ cần quản trị viên phê duyệt</span>
      </div>
      <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
        <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
        <div className="text-sm text-gray-600">Đang làm</div>
        <span className="text-xs text-gray-600">Tổng các nhiệm vụ chưa làm từ trước đến giờ</span>
      </div>
      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        <div className="text-sm text-gray-600">Hoàn thành</div>
        <span className="text-xs text-gray-600">Tổng các nhiệm vụ đã hoàn thành từ trước đến giờ</span>
      </div>
      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
        <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
        <div className="text-sm text-gray-600">Hủy</div>
        <span className="text-xs text-gray-600">Tổng các nhiệm vụ đã hủy từ trước đến giờ</span>
      </div>
    </div>
  );
}
