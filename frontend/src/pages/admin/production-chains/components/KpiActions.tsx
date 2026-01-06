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
        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        title="Ban hành KPI"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      )}
      {hasKpi && (
      <button
        type="button"
        onClick={onOpenKpiEditModal}
        className="text-xs font-semibold text-yellow-600 hover:text-yellow-700"
        title="Chỉnh sửa KPI"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      )}
      {hasKpi && isAdmin && onDeleteKpi && selectedKpiId && (
      <button
        type="button"
        onClick={() => onDeleteKpi(selectedKpiId)}
        className="text-xs font-semibold text-red-600 hover:text-red-700"
      >
            <svg className="ml-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <title>Xóa KPI</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
      </button>
      )}
    </div>
  );
}