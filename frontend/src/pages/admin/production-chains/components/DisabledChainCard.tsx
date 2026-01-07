import type { ProductionChain, ProductionChainStep } from "../../../../api/productionChains";

interface Props {
  chain: ProductionChain;
  isAdmin: boolean;
  // allow passing whether the current user can view details (e.g., leader)
  canViewDetails?: boolean;
  onEnable: (chain: ProductionChain) => void;
  onViewDetails?: (chain: ProductionChain) => void;
}

export default function DisabledChainCard({ chain, isAdmin, canViewDetails, onEnable, onViewDetails }: Props) {
  return (
    <div className="bg-white border border-red-50 rounded-2xl shadow-sm p-6 opacity-95">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-red-700">{chain.name}</h2>
          {chain.description ? (
            chain.description.length > 200 ? (
              <p className="mt-1 text-sm text-red-500 truncate max-w-[80ch]" title={chain.description}>{chain.description.slice(0, 200)}...<span className="text-red-400 font-medium" aria-label={`Xem nội dung đầy đủ: ${chain.name}`}>Xem Thêm</span></p>
            ) : (
              <p className="mt-1 text-sm text-red-500 truncate max-w-[80ch]">{chain.description}</p>
            )
          ) : (
            <p className="mt-1 text-sm text-red-500 truncate max-w-[80ch]">—</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
              Đã vô hiệu hóa
            </span>
          </div>
        </div>
        <div className="flex gap-3 ml-4">
          {isAdmin && (
            <button
              onClick={() => onEnable(chain)}
              className="inline-flex items-center text-red-600 px-3 py-2 text-sm leading-4 font-medium rounded-md hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Kích hoạt lại
            </button>
          )}

          {(isAdmin || canViewDetails) && onViewDetails && (
            <button
              onClick={() => onViewDetails(chain)}
              className="inline-flex items-center px-3 py-2 text-sm leading-4 font-medium rounded-md bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-300"
            >
              Xem chi tiết
            </button>
          )}
        </div>
      </div>

      {/* Chain Steps */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Các bước thực hiện:</h3>
        <div className="flex flex-wrap gap-2">
          {(chain.steps ?? []).slice().sort((a, b) => a.step_order - b.step_order).map((step: ProductionChainStep, index: number) => (
            <div key={step.step_id || index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
              <span className="font-medium mr-1">{step.department?.name ?? "—"}.</span>
              {step.title}
              {typeof step.step_order === 'number' && (
                <span className="ml-2 text-xs text-gray-600">({step.step_order})</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chain Info */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span>Tạo bởi: {chain.creator?.name ?? 'N/A'}</span>
        </div>
        <span>{chain.created_at ? new Date(chain.created_at).toLocaleDateString('vi-VN') : '-'}</span>
      </div>
    </div>
  );
}
