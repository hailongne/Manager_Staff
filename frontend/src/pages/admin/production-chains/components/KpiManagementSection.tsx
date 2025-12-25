import { useState } from "react";
import { KpiSection } from "./KpiSection";
import { KpiEditModal } from "./KpiEditModal";
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
  onCreateNewKpi?: () => void;
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
  onCreateNewKpi
}: KpiManagementSectionProps) {
  const [showKpiEditModal, setShowKpiEditModal] = useState(false);

  const handleOpenKpiEditModal = () => {
    setShowKpiEditModal(true);
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
        onCreateNewKpi={onCreateNewKpi}
      />

      <KpiEditModal
        isOpen={showKpiEditModal}
        kpi={selectedKpi}
        chain={productionChain}
        onClose={() => setShowKpiEditModal(false)}
        onSuccess={onKpiUpdate}
        userRole={userRole || 'user'}
      />
    </>
  );
}