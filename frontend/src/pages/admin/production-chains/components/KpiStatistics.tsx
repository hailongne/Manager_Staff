import type { KpiWeek } from "./types";

interface KpiStatisticsProps {
  previewWeeks: KpiWeek[];
  effectiveTotalKpi: number;
}

export function KpiStatistics({ previewWeeks, effectiveTotalKpi }: KpiStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-xl p-4 border border-sky-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-sky-700">Tổng tuần</p>
            <p className="text-2xl font-bold text-sky-900">{previewWeeks.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">Ngày đi làm</p>
            <p className="text-2xl font-bold text-green-900">
              {previewWeeks.reduce((sum, week) => sum + week.days.filter(day => day.user_attending).length, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-700">Đã hoàn thành</p>
            <p className="text-2xl font-bold text-emerald-900">
              {previewWeeks.reduce((sum, week) => sum + week.days.filter(day => day.is_completed).length, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-purple-700">KPI/ngày TB</p>
            <p className="text-2xl font-bold text-purple-900">
              {(() => {
                const totalDays = previewWeeks.reduce((sum, week) => sum + week.days.filter(day => day.user_attending).length, 0);
                const totalKpi = effectiveTotalKpi;
                return totalDays > 0 ? Math.floor(totalKpi / totalDays) : 0;
              })()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-orange-700">KPI/tuần TB</p>
            <p className="text-2xl font-bold text-orange-900">
              {previewWeeks.length > 0 ? Math.floor(effectiveTotalKpi / previewWeeks.length) : 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700">KPI Hoàn thành</p>
            <p className="text-lg font-bold text-blue-900">
              {(() => {
                const completedKpi = previewWeeks.reduce((sum, week) => sum + week.days.filter(day => day.is_completed).reduce((daySum, day) => daySum + (day.target_value || 0), 0), 0);
                const totalKpi = effectiveTotalKpi;
                return `${completedKpi} / ${totalKpi}`;
              })()}
            </p>
            <p className="text-xs text-blue-600">
              Còn lại: {(() => {
                const completedKpi = previewWeeks.reduce((sum, week) => sum + week.days.filter(day => day.is_completed).reduce((daySum, day) => daySum + (day.target_value || 0), 0), 0);
                const totalKpi = effectiveTotalKpi;
                return totalKpi - completedKpi;
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}