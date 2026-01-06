import type { ChainKpi } from "../types";
import { toggleDayCompletion } from "../../../../api/productionChains";
import { useState, useEffect, useCallback } from "react";
import { KpiActions } from "./KpiActions";
import { KpiSummary } from "./KpiSummary";
import { KpiTable } from "./KpiTable";

interface KpiSectionProps {
  selectedKpi: ChainKpi | null;
  latestKpi: ChainKpi | null;
  hasKpis: boolean;
  kpiSummaryMonth: number;
  kpiSummaryYear: number;
  canCompleteKpi: boolean;
  canEditKpi: boolean;
  isAdmin: boolean;
  chainKpis?: ChainKpi[];
  onOpenKpiEditModal: () => void;
  onKpiCompletionUpdate?: () => void;
  onCreateNewKpi?: () => void;
  onDeleteKpi?: (kpiId: number) => void;
  onKpiSelectionChange?: (kpi: ChainKpi | null) => void;
}

export function KpiSection({
  selectedKpi,
  latestKpi,
  hasKpis,
  kpiSummaryMonth,
  kpiSummaryYear,
  canCompleteKpi,
  canEditKpi,
  isAdmin,
  chainKpis = [],
  onOpenKpiEditModal,
  onKpiCompletionUpdate,
  onCreateNewKpi,
  onDeleteKpi,
  onKpiSelectionChange
}: KpiSectionProps) {
  const [localSelectedKpi, setLocalSelectedKpi] = useState<ChainKpi | null>(selectedKpi);
  const [selectedKpiId, setSelectedKpiId] = useState<string>('');

  // Update local state when selectedKpi changes
  useEffect(() => {
    console.log('KpiSection: selectedKpi changed:', selectedKpi ? { id: selectedKpi.chain_kpi_id, hasWeeks: !!selectedKpi.weeks } : 'null');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSelectedKpi(selectedKpi);
    setSelectedKpiId(selectedKpi?.chain_kpi_id?.toString() || '');
  }, [selectedKpi]);

  // Notify parent when localSelectedKpi changes
  useEffect(() => {
    onKpiSelectionChange?.(localSelectedKpi);
  }, [localSelectedKpi, onKpiSelectionChange]);

  // Check if there are multiple KPIs for filtering
  const hasMultipleKpis = chainKpis.length > 1;

  const handleKpiFilterChange = (kpiId: string) => {
    setSelectedKpiId(kpiId);
    const kpi = chainKpis.find(k => k.chain_kpi_id?.toString() === kpiId);
    setLocalSelectedKpi(kpi || null);
  };



  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatDayDetail = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'long' });
    
    return `${dayOfWeek}, ${day} tháng ${month}`;
  };

  const handleDayRightClick = async (dateStr: string, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent context menu
    
    if (!localSelectedKpi || !canCompleteKpi) {
      return;
    }

    try {
      await toggleDayCompletion(localSelectedKpi.chain_kpi_id, dateStr);
      
      // Update local state to toggle completion
      setLocalSelectedKpi(prev => {
        if (!prev || !prev.weeks) return prev;
        
        const updatedKpi = { ...prev };
        updatedKpi.weeks = prev.weeks.map(week => ({
          ...week,
          days: week.days.map(day => 
            day.date === dateStr 
              ? { ...day, is_completed: !day.is_completed }
              : day
          )
        }));
        
        return updatedKpi;
      });
      
      // Notify parent component to update kpiCompletionState
      onKpiCompletionUpdate?.();
    } catch (error) {
      console.error('Error toggling day completion:', error);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-sky-700">
            {localSelectedKpi ? `KPI từ ${formatDate(localSelectedKpi.start_date)} đến ${formatDate(localSelectedKpi.end_date)}` : `KPI tháng ${kpiSummaryMonth}/${kpiSummaryYear}`}
          </h4>
        </div>

        <KpiActions
          canEditKpi={canEditKpi}
          hasKpi={!!localSelectedKpi}
          isAdmin={isAdmin}
          onCreateNewKpi={onCreateNewKpi}
          onOpenKpiEditModal={onOpenKpiEditModal}
          onDeleteKpi={onDeleteKpi}
          selectedKpiId={localSelectedKpi?.chain_kpi_id}
        />
      </div>

      {localSelectedKpi ? (
        <div className="mt-3">
          <KpiSummary kpi={localSelectedKpi} formatDate={formatDate} />

          <KpiTable
            kpi={localSelectedKpi}
            formatDate={formatDate}
            formatDayDetail={formatDayDetail}
            onDayRightClick={handleDayRightClick}
            canCompleteKpi={canCompleteKpi}
            hasMultipleKpis={hasMultipleKpis}
            chainKpis={chainKpis}
            selectedKpiId={selectedKpiId}
            onKpiFilterChange={handleKpiFilterChange}
            
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-sky-700">
          {hasKpis
            ? `Tháng này chưa có KPI. Gần nhất: ${latestKpi?.start_date ? new Date(latestKpi.start_date).toLocaleDateString('vi-VN') : 'N/A'} với chỉ tiêu ${latestKpi ? latestKpi.target_value : 0}.`
            : "Chuỗi chưa có KPI nào được ban hành."}
        </p>
      )}
    </div>
  );
}