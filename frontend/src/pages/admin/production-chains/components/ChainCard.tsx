import type { ProductionChain, ProductionChainStep } from "../../../../api/productionChains";

interface ChainCardProps {
  chain: ProductionChain;
  isDisabled?: boolean;
  onEdit?: (chain: ProductionChain) => void;
  onEnable?: (chain: ProductionChain) => void;
  onFeedback?: (chain: ProductionChain) => void;
  onDelete?: (chain: ProductionChain) => void;
  canEdit?: boolean;
  canEnable?: boolean;
  canFeedback?: boolean;
  canDelete?: boolean;
}

export function ChainCard({
  chain,
  isDisabled = false,
  onEdit,
  onEnable,
  onFeedback,
  onDelete,
  canEdit = false,
  canEnable = false,
  canFeedback = false,
  canDelete = false
}: ChainCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">{chain.name}</h2>
          <p className="text-gray-600 mt-1">{chain.description}</p>
          <div className="flex items-center gap-2 mt-2">
            {isDisabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Đã vô hiệu hóa
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3 ml-4">
          {canFeedback && onFeedback && (
            <button
              onClick={() => onFeedback(chain)}
              className="inline-flex items-center text-blue-600 px-3 py-2 text-sm leading-4 font-medium rounded-md hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Phản hồi
            </button>
          )}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(chain)}
              className="inline-flex items-center text-indigo-600 px-3 py-2 text-sm leading-4 font-medium rounded-md hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Chỉnh sửa
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(chain)}
              className="inline-flex items-center text-red-600 px-3 py-2 text-sm leading-4 font-medium rounded-md hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Xóa chuỗi
            </button>
          )}
          {isDisabled && canEnable && onEnable && (
            <button
              onClick={() => onEnable(chain)}
              className="inline-flex items-center text-green-600 px-3 py-2 text-sm leading-4 font-medium rounded-md hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Kích hoạt lại
            </button>
          )}
        </div>
      </div>

      {/* Chain Steps */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Các bước thực hiện:</h3>
        <div className="flex flex-wrap gap-2">
          {chain.steps?.sort((a, b) => a.step_order - b.step_order).map((step: ProductionChainStep, index: number) => (
            <div key={step.step_id || index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
              <span className="font-medium mr-1">{step.step_order}.</span>
              {step.title}
              {step.department && (
                <span className="ml-2 text-xs text-gray-600">({step.department.name})</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chain Info */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span>Tạo bởi: {chain.creator?.name || 'N/A'}</span>
          <span>KPI: {chain.total_kpi || 0}</span>
          {chain.start_date && chain.end_date && (
            <span>
              Thời hạn: {new Date(chain.start_date).toLocaleDateString('vi-VN')} - {new Date(chain.end_date).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>
        <span>{new Date(chain.created_at || '').toLocaleDateString('vi-VN')}</span>
      </div>
    </div>
  );
}