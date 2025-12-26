import { useState, useRef, useEffect } from "react";
import type { ChainKpi } from "../types";

interface KpiFilterProps {
  chainKpis: ChainKpi[];
  selectedKpiId: string;
  onKpiFilterChange: (kpiId: string) => void;
}

export function KpiFilter({ chainKpis, selectedKpiId, onKpiFilterChange }: KpiFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedKpi = chainKpis.find(kpi => kpi.chain_kpi_id?.toString() === selectedKpiId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (kpiId: string) => {
    onKpiFilterChange(kpiId);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-sky-50 border-2 border-sky-200 rounded-xl px-4 py-2.5 pr-3 text-sm font-semibold text-sky-800 hover:from-sky-100 hover:via-sky-50 hover:to-sky-100 hover:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 min-w-[220px] backdrop-blur-sm"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          {selectedKpi ? (
            <span>
              {selectedKpi.start_date ? new Date(selectedKpi.start_date).toLocaleDateString('vi-VN') : 'N/A'} - {selectedKpi.target_value} KPI
            </span>
          ) : (
            <span>Chọn KPI</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-sky-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border-2 border-sky-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="max-h-60 overflow-y-auto">
            <button
              onClick={() => handleSelect('')}
              className="w-full px-4 py-3 text-left text-sm font-medium text-sky-700 hover:bg-sky-50 hover:text-sky-800 transition-colors duration-150 flex items-center gap-2 border-b border-sky-100 last:border-b-0"
            >
              <span className="text-lg">📊</span>
              <span>Chọn KPI</span>
            </button>
            {chainKpis.map(kpi => (
              <button
                key={kpi.chain_kpi_id}
                onClick={() => handleSelect(kpi.chain_kpi_id?.toString() || '')}
                className="w-full px-4 py-3 text-left text-sm font-medium text-sky-700 hover:bg-sky-50 hover:text-sky-800 transition-colors duration-150 flex items-center gap-2 border-b border-sky-100 last:border-b-0"
              >
                <span className="text-lg">📅</span>
                <span>
                  {kpi.start_date ? new Date(kpi.start_date).toLocaleDateString('vi-VN') : 'N/A'} - 🎯 {kpi.target_value} KPI
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-sky-200 opacity-50"></div>
    </div>
  );
}