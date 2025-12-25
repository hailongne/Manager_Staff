import type { UserStats } from "../types";
import { EMPLOYMENT_STATUS_OPTIONS } from "../utils";

interface StatsSectionProps {
  stats: UserStats;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  employmentStatusFilter: string;
  onFilterChange: (value: string) => void;
}

export function StatsSection({
  stats,
  searchTerm,
  onSearchChange,
  employmentStatusFilter,
  onFilterChange
}: StatsSectionProps) {
  if (!stats.byStatus.length) return null;

  return (
    <section className="mb-6 bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pink-300 text-sm">
            🔍
          </span>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên, email, mã..."
            className="w-full pl-8 pr-8 py-2 text-sm rounded-lg bg-pink-50 border border-pink-200 text-gray-700 placeholder-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600"
              aria-label="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={employmentStatusFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="ms-select text-xs"
        >
          <option value="all">Tất cả trạng thái</option>
          {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-xs font-semibold">
          Tổng: {stats.total}
        </div>
        {stats.byStatus.map((item) => (
          <div
            key={item.status}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              item.status === "Đã nghỉ"
                ? "bg-gray-100 text-gray-400 opacity-50"
                : "bg-pink-50 text-pink-600"
            }`}
          >
            {item.status}: {item.value}
          </div>
        ))}
      </div>
    </section>
  );
}
