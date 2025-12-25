import type { TaskFiltersProps, EmploymentFilter } from "../types";
import { getWeekLabel, WEEK_OFFSET_OPTIONS } from "../utils";

export function TaskFilters({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  employmentFilter,
  onEmploymentFilterChange,
  selectedUser,
  onUserChange,
  selectedWeekOffset,
  onWeekOffsetChange,
  userOptions,
  isApprovalTab
}: TaskFiltersProps) {
  return (
    <div className="p-1 flex flex-wrap items-center gap-1">
      <div className="flex items-center gap-1">
        <div className="relative">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm kiếm"
            className="pl-2 pr-2 py-2 text-sm rounded-full bg-pink-50 border border-pink-200 text-gray-700 placeholder-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600"
              aria-label="Xóa tìm kiếm"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <select
          value={selectedStatus}
          onChange={(event) => onStatusChange(event.target.value)}
          className="ms-select min-w-[100px] text-xs"
          disabled={isApprovalTab}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="in_progress">Đang làm</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Hủy</option>
        </select>
      </div>
      <div className="flex items-center gap-1">
        <select
          value={employmentFilter}
          onChange={(event) => onEmploymentFilterChange(event.target.value as EmploymentFilter)}
          className="ms-select min-w-[150px] text-xs"
        >
          <option value="active">Nhân viên đang làm</option>
          <option value="resigned">Nhân viên đã nghỉ</option>
        </select>
      </div>
      <div className="flex items-center gap-1">
        <select
          value={selectedUser}
          onChange={(event) => onUserChange(event.target.value)}
          className="ms-select min-w-[240px] text-xs"
          disabled={userOptions.length === 0}
        >
          <option value="all">
            {employmentFilter === "resigned" ? "Tất cả nhân viên đã nghỉ" : "Tất cả nhân viên"}
          </option>
          {userOptions.map((item) => (
            <option key={item.user_id} value={item.user_id}>
              {item.name} ({item.email})
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <select
          value={selectedWeekOffset}
          onChange={(event) => onWeekOffsetChange(Number(event.target.value))}
          className="ms-select min-w-[150px] text-xs"
          disabled={isApprovalTab}
        >
          <option value={999}>Tất cả nhiệm vụ</option>
          {WEEK_OFFSET_OPTIONS.map((offset) => (
            <option key={offset} value={offset}>
              {offset === 1 ? "Tuần tới" : getWeekLabel(offset)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
