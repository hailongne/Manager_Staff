import type { ProductionChain } from "../../../../api/productionChains";
import { ChainCard } from "./ChainCard";

interface ChainListProps {
  chains: ProductionChain[];
  isDisabled?: boolean;
  loading?: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEditChain?: (chain: ProductionChain) => void;
  onEnableChain?: (chain: ProductionChain) => void;
  onFeedback?: (chain: ProductionChain) => void;
  onDeleteChain?: (chain: ProductionChain) => void;
  canEdit?: boolean;
  canEnable?: boolean;
  canFeedback?: boolean;
  canDelete?: boolean;
  emptyMessage?: string;
}

export function ChainList({
  chains,
  isDisabled = false,
  loading = false,
  searchTerm,
  onSearchChange,
  onEditChain,
  onEnableChain,
  onFeedback,
  onDeleteChain,
  canEdit = false,
  canEnable = false,
  canFeedback = false,
  canDelete = false,
  emptyMessage = "Không có chuỗi sản xuất nào."
}: ChainListProps) {
  const filteredChains = chains.filter(chain => {
    const matchesName = chain.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesName;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm chuỗi sản xuất..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Chain List */}
      {filteredChains.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChains.map((chain) => (
            <ChainCard
              key={chain.chain_id}
              chain={chain}
              isDisabled={isDisabled}
              onEdit={onEditChain}
              onEnable={onEnableChain}
              onFeedback={onFeedback}
              onDelete={onDeleteChain}
              canEdit={canEdit}
              canEnable={canEnable}
              canFeedback={canFeedback}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}