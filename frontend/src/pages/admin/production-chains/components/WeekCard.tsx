import type { KpiWeek } from "./types";
import { DayCard } from "./DayCard";

interface WeekCardProps {
  week: KpiWeek;
  userRole?: string;
  canEditWeek: (week: KpiWeek) => boolean;
  onWeekTargetChange: (weekIndex: number, value: string) => void;
  onToggleAttending: (weekIndex: number, date: string) => void;
  onDayTargetChange: (weekIndex: number, date: string, value: string) => void;
  formatDate: (dateStr: string | undefined) => string;
  formatDayDetail: (date: string) => string;
}

export function WeekCard({
  week,
  userRole,
  canEditWeek,
  onWeekTargetChange,
  onToggleAttending,
  onDayTargetChange,
  formatDate,
  formatDayDetail
}: WeekCardProps) {
  return (
    <div className="bg-white rounded-xl border-2 border-sky-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Week Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-sky-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {week.week_index}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Tuần {week.week_index}</h4>
              <p className="text-sm text-gray-600">
                {formatDate(week.start_date)} - {formatDate(week.end_date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <label className="block text-sm font-medium text-gray-700 mb-1">KPI tuần</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={week.target_value || ''}
                  onChange={(e) => onWeekTargetChange(week.week_index, e.target.value)}
                  disabled={!canEditWeek(week)}
                  title={canEditWeek(week) ? "Chỉnh sửa KPI tuần" : "Tuần này đã hoàn thành hoặc không có ngày đi làm"}
                  className={`w-24 rounded-lg border-2 px-3 py-2 text-center font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200 appearance-none ${
                    canEditWeek(week)
                      ? 'border-gray-200 bg-white text-gray-900'
                      : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Days Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {week.days.map((day) => (
            <DayCard
              key={day.date}
              day={day}
              weekIndex={week.week_index}
              userRole={userRole}
              onToggleAttending={onToggleAttending}
              onDayTargetChange={onDayTargetChange}
              formatDayDetail={formatDayDetail}
            />
          ))}
        </div>
      </div>
    </div>
  );
}