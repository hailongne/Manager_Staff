interface KpiEditActionsProps {
  newTotalKpi: number;
  onNewTotalKpiChange: (value: string) => void;
  onSaveNewTotalKpi: () => void;
  currentTotalKpi: number;
  effectiveTotalKpi: number;
  kpiDifference: number;
  onDistributeEvenly: () => void;
  weeksLength: number;
  loading: boolean;
  onClose: () => void;
}

export function KpiEditActions({
  newTotalKpi,
  onNewTotalKpiChange,
  onSaveNewTotalKpi,
  currentTotalKpi,
  effectiveTotalKpi,
  kpiDifference,
  onDistributeEvenly,
  weeksLength,
  loading,
  onClose
}: KpiEditActionsProps) {
  return (
    <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-orange-100 p-6 -mx-8 -mb-8 mt-8 flex items-center justify-between gap-4">
      {/* KPI Total Input Card */}
      <div className="flex gap-4">
        {/* KPI Total Input Card */}
        <div className="bg-gradient-to-br from-white to-orange-50 rounded-lg p-3 border border-orange-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-orange-700">KPI Mới (Tổng)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newTotalKpi || ''}
                onChange={(e) => onNewTotalKpiChange(e.target.value)}
                className="w-20 rounded-md border-2 px-2 py-1 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-all duration-200 appearance-none border-orange-100 bg-white text-orange-900"
                title="Chỉnh sửa KPI tổng mới"
              />
              <button
                type="button"
                onClick={onSaveNewTotalKpi}
                className="px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all duration-200"
                title="Lưu KPI tổng mới và phân bổ đều"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>

        {/* KPI Status Indicator */}
        <div className="bg-gradient-to-br from-white to-orange-50 rounded-lg p-3 border border-orange-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-orange-700">KPI Hiện Tại</p>
            <p className={`text-xl font-bold ${kpiDifference === 0 ? 'text-green-600' : kpiDifference > 0 ? 'text-orange-600' : 'text-red-600'}`}>
              {currentTotalKpi}/{effectiveTotalKpi}
            </p>
            <p className={`text-xs ${kpiDifference === 0 ? 'text-green-600' : kpiDifference > 0 ? 'text-orange-600' : 'text-red-600'}`}>
              {kpiDifference === 0 ? 'Đủ' : kpiDifference > 0 ? `Thừa ${kpiDifference}` : `Thiếu ${Math.abs(kpiDifference)}`} KPI
            </p>
          </div>
        </div>

        {/* Distribute Evenly Card */}
        <div className="bg-gradient-to-br from-white to-orange-50 rounded-lg p-3 border border-orange-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-orange-700">Phân bổ tự động</p>
            <button
              type="button"
              onClick={onDistributeEvenly}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              disabled={!weeksLength}
              title="Tự động phân bổ KPI cho các ngày đi làm chưa hoàn thành, giữ nguyên KPI của ngày đã hoàn thành"
            >
              Phân bổ
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold border-2 border-orange-100 text-orange-700 bg-white shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-100"
        >
          Hủy
        </button>
        <button
          type="submit"
          onClick={onSaveNewTotalKpi}
          disabled={loading}
          className={`inline-flex items-center rounded-full overflow-hidden shadow-sm transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ background: 'linear-gradient(90deg, #fb923c 0%, #fb7a2d 100%)' }}
        >
          {loading ? (
            <>
              <span className="px-4 py-2 text-sm font-medium text-white">Đang lưu...</span>
              <span className="w-8 h-8 mr-1 bg-white flex items-center justify-center rounded-full">
                <div className="w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
              </span>
            </>
          ) : (
            <>
              <span className="px-4 py-2 text-sm font-medium text-white">Lưu thay đổi</span>
              <span className="w-8 h-8 mr-1 bg-white flex items-center justify-center rounded-full">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}