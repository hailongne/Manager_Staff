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
    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-6 -mx-8 -mb-8 mt-8 flex items-center justify-between gap-4">
      {/* KPI Total Input Card */}
      <div className="flex gap-4">
        {/* KPI Total Input Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700">KPI Tổng Mới</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newTotalKpi || ''}
                onChange={(e) => onNewTotalKpiChange(e.target.value)}
                className="w-20 rounded-lg border-2 px-2 py-1 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none border-blue-200 bg-white text-blue-900"
                title="Chỉnh sửa KPI tổng mới"
              />
              <button
                type="button"
                onClick={onSaveNewTotalKpi}
                className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200"
                title="Lưu KPI tổng mới và phân bổ đều"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>

        {/* KPI Status Indicator */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-300 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Tổng KPI hiện tại</p>
            <p className={`text-xl font-bold ${kpiDifference === 0 ? 'text-green-600' : kpiDifference > 0 ? 'text-orange-600' : 'text-red-600'}`}>
              {currentTotalKpi}/{effectiveTotalKpi}
            </p>
            <p className={`text-xs ${kpiDifference === 0 ? 'text-green-600' : kpiDifference > 0 ? 'text-orange-600' : 'text-red-600'}`}>
              {kpiDifference === 0 ? 'Đủ' : kpiDifference > 0 ? `Thừa ${kpiDifference}` : `Thiếu ${Math.abs(kpiDifference)}`} KPI
            </p>
          </div>
        </div>

        {/* Distribute Evenly Card */}
        <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-xl p-4 border border-sky-200 flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-sky-700">Phân bổ đều</p>
            <button
              type="button"
              onClick={onDistributeEvenly}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white text-sm font-semibold rounded-lg hover:from-sky-600 hover:to-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
          className="px-6 py-2.5 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold hover:from-sky-600 hover:to-sky-700 focus:ring-4 focus:ring-sky-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang lưu...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Lưu thay đổi
            </>
          )}
        </button>
      </div>
    </div>
  );
}