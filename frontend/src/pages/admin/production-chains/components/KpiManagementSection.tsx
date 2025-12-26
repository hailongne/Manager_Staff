import { useState, useEffect } from "react";
import { KpiSection } from "./KpiSection";
import { KpiEditModal } from "./KpiEditModal";
import { KpiCreateModal } from "./KpiCreateModal";
import type { ChainKpi, ProductionChain } from "../../../../api/productionChains";

interface KpiManagementSectionProps {
  productionChain: ProductionChain | null;
  selectedKpi: ChainKpi | null;
  latestKpi: ChainKpi | null;
  hasKpis: boolean;
  kpiSummaryMonth: number;
  kpiSummaryYear: number;
  canCompleteKpi: boolean;
  canEditKpi: boolean;
  userRole?: string;
  chainKpis?: ChainKpi[];
  onKpiCompletionUpdate?: () => void;
  onKpiUpdate?: () => void;
  onDeleteKpi?: (kpiId: number) => void;
}

export function KpiManagementSection({
  productionChain,
  selectedKpi,
  latestKpi,
  hasKpis,
  kpiSummaryMonth,
  kpiSummaryYear,
  canCompleteKpi,
  canEditKpi,
  userRole,
  chainKpis = [],
  onKpiCompletionUpdate,
  onKpiUpdate,
  onDeleteKpi
}: KpiManagementSectionProps) {
  const [showKpiEditModal, setShowKpiEditModal] = useState(false);
  const [showKpiCreateModal, setShowKpiCreateModal] = useState(false);
  const [currentSelectedKpi, setCurrentSelectedKpi] = useState<ChainKpi | null>(selectedKpi);

  // Update currentSelectedKpi when selectedKpi changes
  useEffect(() => {
    setCurrentSelectedKpi(selectedKpi);
  }, [selectedKpi]);

  const handleOpenKpiEditModal = () => {
    setShowKpiEditModal(true);
  };

  const handleOpenKpiCreateModal = () => {
    setShowKpiCreateModal(true);
  };

  const handleKpiSelectionChange = (kpi: ChainKpi | null) => {
    setCurrentSelectedKpi(kpi);
  };

  const isAdmin = userRole === 'admin';

  return (
    <>
      <KpiSection
        selectedKpi={selectedKpi}
        latestKpi={latestKpi}
        hasKpis={hasKpis}
        kpiSummaryMonth={kpiSummaryMonth}
        kpiSummaryYear={kpiSummaryYear}
        canCompleteKpi={canCompleteKpi}
        canEditKpi={canEditKpi}
        isAdmin={isAdmin}
        chainKpis={chainKpis}
        onOpenKpiEditModal={handleOpenKpiEditModal}
        onKpiCompletionUpdate={onKpiCompletionUpdate}
        onCreateNewKpi={handleOpenKpiCreateModal}
        onDeleteKpi={onDeleteKpi}
        onKpiSelectionChange={handleKpiSelectionChange}
      />

      <KpiEditModal
        isOpen={showKpiEditModal}
        kpi={currentSelectedKpi}
        chain={productionChain}
        onClose={() => setShowKpiEditModal(false)}
        onSuccess={onKpiUpdate}
        userRole={userRole || 'user'}
      />

      <KpiCreateModal
        isOpen={showKpiCreateModal}
        chain={productionChain}
        onClose={() => setShowKpiCreateModal(false)}
        onSuccess={onKpiUpdate}
      />
    </>
  );
}