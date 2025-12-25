import type { ChainKpi } from "../types";

interface KpiSummaryProps {
  kpi: ChainKpi;
  formatDate: (dateStr: string | undefined) => string;
}

export function KpiSummary({ kpi, formatDate }: KpiSummaryProps) {
  return (
    <div className="mb-3">
      <p className="text-sm text-sky-800">
        Chỉ tiêu tổng: <span className="font-semibold">{kpi.target_value} KPI</span>
      </p>
      {kpi.start_date && kpi.end_date && (
        <p className="text-xs text-sky-600 mt-1">
          Thời hạn: {formatDate(kpi.start_date)} - {formatDate(kpi.end_date)}
        </p>
      )}
    </div>
  );
}