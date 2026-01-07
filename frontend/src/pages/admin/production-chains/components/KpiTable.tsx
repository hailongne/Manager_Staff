import type { ChainKpi } from "../types";
import { KpiFilter } from "./KpiFilter";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";

interface KpiTableProps {
  kpi: ChainKpi;
  formatDate: (dateStr: string | undefined) => string;
  formatDayDetail: (dateStr: string) => string;
  onDayRightClick: (dateStr: string, event: React.MouseEvent) => void;
  canCompleteKpi: boolean;
  hasMultipleKpis: boolean;
  chainKpis: ChainKpi[];
  selectedKpiId: string;
  onKpiFilterChange: (kpiId: string) => void;
  readOnly?: boolean;
  bodyScrollable?: boolean;
}

export function KpiTable({ kpi, formatDate, formatDayDetail, onDayRightClick, canCompleteKpi, hasMultipleKpis, chainKpis, selectedKpiId, onKpiFilterChange, readOnly = false, bodyScrollable = false }: KpiTableProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (!kpi.weeks || kpi.weeks.length === 0) {
    return (
      <p className="text-xs text-sky-600">
        Đang tính toán phân bổ KPI theo thời hạn...
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-medium text-orange-800">Lịch trình tuần:</h5>

      {/* KPI Filter when multiple KPIs exist */}
      {hasMultipleKpis && (
        <KpiFilter
          chainKpis={chainKpis}
          selectedKpiId={selectedKpiId}
          onKpiFilterChange={onKpiFilterChange}
        />
      )}
      <div className={bodyScrollable ? 'space-y-3 max-h-[420px] overflow-y-auto pr-2' : 'space-y-3'}>
      {kpi.weeks.map((week) => {
        const weekTarget = Number(week.target_value || 0);
        const assignedKpi = week.days.reduce((sum, day) => sum + Number(day.target_value || 0), 0);
        const remainingKpi = Math.max(weekTarget - assignedKpi, 0);
        const canAssignWeek = weekTarget > 0 && user?.role === 'leader' && !readOnly;

        return (
          <div key={week.week_index} className="relative overflow-hidden rounded-lg border border-orange-100 border-l-6 border-l-orange-200 bg-white p-3 pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-orange-200 to-transparent opacity-50 pointer-events-none" aria-hidden="true" />
            <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-orange-200 to-transparent opacity-80 pointer-events-none" aria-hidden="true" />
            <div className="absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-orange-200 to-transparent opacity-80 pointer-events-none" aria-hidden="true" />
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="block text-sm font-medium text-orange-800">Tuần {week.week_index}</span>
                <span className="text-sm text-orange-600">{formatDate(week.start_date)} - {formatDate(week.end_date)}</span>
              </div>
              {canAssignWeek && (
                <button
                  type="button"
                  onClick={() => navigate(`/production-chains/assign-week/${kpi.chain_id}/${kpi.chain_kpi_id}/${week.week_index}`)}
                  className="flex flex-col rounded-md border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                  title={`Còn ${remainingKpi} KPI chưa phân bổ`}
                >
                  <span>Giao việc</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-sm text-orange-700 mb-2">
              <span>
                Chỉ tiêu theo tuần: <span className="font-semibold">{weekTarget} KPI</span>
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {week.days.map((day) => (
                <div
                  key={day.date}
                  className={`text-center p-2 rounded text-xs min-h-[60px] flex flex-col justify-between cursor-pointer transition-all ${
                    day.is_completed
                      ? 'bg-green-100 text-green-800 border-2 border-green-300'
                      : (day.target_value === undefined || day.target_value === null || day.target_value === 0)
                      ? 'bg-gray-50 text-gray-300 hover:bg-gray-200 border-2 border-gray-300'
                      : 'bg-orange-100 text-orange-800 border-2 border-orange-300 hover:bg-orange-50'
                  }`}
                  onContextMenu={canCompleteKpi && !readOnly ? (e) => onDayRightClick(day.date, e) : undefined}
                  title={
                    day.is_completed
                      ? 'Đã hoàn thành - Click chuột phải để bỏ tích'
                      : (day.target_value === undefined || day.target_value === null || day.target_value === 0)
                      ? 'Chưa có KPI được phân bổ'
                      : 'Click chuột phải để đánh dấu hoàn thành'
                  }
                >
                  <div className="font-medium text-center leading-tight">{formatDayDetail(day.date)}</div>
                  <div className="mt-1 font-semibold flex items-center justify-center gap-1">
                    {day.is_completed && <span className="text-green-600">✓</span>}
                    {(day.target_value === undefined || day.target_value === null || day.target_value === 0) ? (
                      <span className="text-red-600">⚠</span>
                    ) : null}
                    {day.target_value || 0} KPI
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}