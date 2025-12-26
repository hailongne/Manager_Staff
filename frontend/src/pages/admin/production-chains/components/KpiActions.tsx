interface KpiActionsProps {
  canEditKpi: boolean;
  hasKpi: boolean;
  isAdmin: boolean;
  onCreateNewKpi?: () => void;
  onOpenKpiEditModal: () => void;
  onDeleteKpi?: (kpiId: number) => void;
  selectedKpiId?: number;
}

export function KpiActions({ canEditKpi, hasKpi, isAdmin, onCreateNewKpi, onOpenKpiEditModal, onDeleteKpi, selectedKpiId }: KpiActionsProps) {
  if (!canEditKpi) return null;

  return (
    <div className="flex items-center gap-2">
      {isAdmin && onCreateNewKpi && (
        <button
          type="button"
          onClick={onCreateNewKpi}
          className="text-xs font-semibold text-green-600 hover:text-green-700"
        >
          Ban hành KPI
        </button>
      )}
      {hasKpi && (
        <button
          type="button"
          onClick={onOpenKpiEditModal}
          className="text-xs font-semibold text-sky-600 hover:text-sky-700"
        >
          Chỉnh sửa
        </button>
      )}
      {hasKpi && isAdmin && onDeleteKpi && selectedKpiId && (
        <button
          type="button"
          onClick={() => onDeleteKpi(selectedKpiId)}
          className="text-xs font-semibold text-red-600 hover:text-red-700"
        >
          Xóa KPI
        </button>
      )}
    </div>
  );
}