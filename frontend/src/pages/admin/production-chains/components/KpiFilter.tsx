import type { ChainKpi } from "../types";

interface KpiFilterProps {
  chainKpis: ChainKpi[];
  selectedKpiId: string;
  onKpiFilterChange: (kpiId: string) => void;
}

export function KpiFilter({ chainKpis, selectedKpiId, onKpiFilterChange }: KpiFilterProps) {
  return (
    <select
      value={selectedKpiId}
      onChange={(e) => onKpiFilterChange(e.target.value)}
      className="text-xs border border-sky-200 rounded px-2 py-1 bg-white"
    >
      <option value="">Chọn KPI</option>
      {chainKpis.map(kpi => (
        <option key={kpi.chain_kpi_id} value={kpi.chain_kpi_id?.toString()}>
          {kpi.month}/{kpi.year} - {kpi.target_value} KPI
        </option>
      ))}
    </select>
  );
}