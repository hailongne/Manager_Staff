import { useEffect, useState } from 'react';
import { getChainKpis, getKpiCompletions } from '../../../../api/productionChains';
import type { ProductionChain } from '../../../../api/productionChains';
import type { ChainKpi } from '../types';
import { KpiManagementSection } from './KpiManagementSection';

interface Props {
  isOpen: boolean;
  chain: ProductionChain | null;
  onClose: () => void;
  chainKpisFallback?: ChainKpi[];
  canCompleteKpi?: boolean;
  onKpiCompletionUpdate?: () => void;
  onKpiUpdate?: (kpi?: ChainKpi) => void;
  onDeleteKpi?: (kpiId: number) => void;
}

export default function DisabledChainModal({ isOpen, chain, onClose, chainKpisFallback = [], canCompleteKpi = false, onKpiCompletionUpdate, onKpiUpdate, onDeleteKpi }: Props) {
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<ChainKpi[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isOpen || !chain) return;
      setLoading(true);
      try {
        if (!chain.chain_id) {
          setKpis([]);
          return;
        }
        const fetched = await getChainKpis(chain.chain_id);
        const enriched = await Promise.all(
          fetched.map(async (kpi) => {
            try {
              const comps = await getKpiCompletions(kpi.chain_kpi_id);
              return { ...kpi, completionCount: comps.length } as ChainKpi & { completionCount?: number };
            } catch {
              return { ...kpi, completionCount: 0 } as ChainKpi & { completionCount?: number };
            }
          })
        );
        if (mounted) setKpis(enriched as ChainKpi[]);
      } catch (err) {
        console.error('Lỗi tải KPI cho modal chuỗi bị vô hiệu hóa:', err);
        if (mounted) setKpis(chainKpisFallback || []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [isOpen, chain, chainKpisFallback]);

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !chain) return null;

  const chainKpisForThisChain: ChainKpi[] = kpis.length > 0 ? kpis : (chainKpisFallback || []);

  const findRelevantKpi = (kpisList: ChainKpi[]) => {
    if (kpisList.length === 0) return null;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentKpi = kpisList.find(kpi => {
      if (!kpi.start_date || !kpi.end_date) return false;
      const startDate = new Date(kpi.start_date);
      const endDate = new Date(kpi.end_date);
      const currentTime = currentYear * 12 + currentMonth;
      const startTime = startDate.getFullYear() * 12 + startDate.getMonth();
      const endTime = endDate.getFullYear() * 12 + endDate.getMonth();
      return currentTime >= startTime && currentTime <= endTime;
    });

    if (currentKpi) return currentKpi;

    return kpisList[0] || null;
  };

  const relevantKpi = findRelevantKpi(chainKpisForThisChain);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disabled-chain-title"
        aria-describedby="disabled-chain-desc"
        className="relative w-full max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden max-h-[90vh] ring-1 ring-black/5"
      >
        <header className="flex items-start justify-between gap-4 px-6 py-4 border-b border-red-50 bg-white">
          <div className="min-w-0">
            <h3 id="disabled-chain-title" className="text-lg font-semibold text-red-700 truncate">
              {chain.name}
            </h3>
            <p
              id="disabled-chain-desc"
              className="mt-1 text-sm text-red-500 truncate max-w-[80ch]"
              title={chain.description || undefined}
            >
              {chain.description ? chain.description : '—'}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="inline-flex items-center justify-center p-2 rounded-md text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M6.293 6.293a1 1 0 011.414 0L10 8.586l2.293-2.293a1 1 0 111.414 1.414L11.414 10l2.293 2.293a1 1 0 01-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 10 6.293 7.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </header>

        <div className="p-6" style={{ maxHeight: '70vh' }}>
          <div className="max-h-[55vh] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" role="status" aria-hidden="true" />
                <p className="mt-2 text-gray-600">Đang tải chi tiết KPI...</p>
              </div>
            ) : (
              <KpiManagementSection
                productionChain={chain}
                selectedKpi={relevantKpi}
                latestKpi={relevantKpi}
                hasKpis={chainKpisForThisChain.length > 0}
                kpiSummaryMonth={relevantKpi?.start_date ? new Date(relevantKpi.start_date).getMonth() + 1 : new Date().getMonth() + 1}
                kpiSummaryYear={relevantKpi?.start_date ? new Date(relevantKpi.start_date).getFullYear() : new Date().getFullYear()}
                canCompleteKpi={canCompleteKpi}
                canEditKpi={false}
                readOnly={true}
                userRole={undefined}
                chainKpis={chainKpisForThisChain}
                onKpiCompletionUpdate={onKpiCompletionUpdate}
                onKpiUpdate={onKpiUpdate}
                onDeleteKpi={onDeleteKpi}
              />
            )}
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-red-50 flex justify-end gap-2 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}
