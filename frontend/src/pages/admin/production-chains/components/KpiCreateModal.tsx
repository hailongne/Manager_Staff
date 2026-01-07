import { useState, useEffect, useRef } from "react";
import { createChainKpi, getChainKpis } from "../../../../api/productionChains";
import type { ProductionChain } from "../../../../api/productionChains";
import { useModalToast } from "../../../../hooks/useToast";
import { Clock, CheckCircle } from "lucide-react";

interface KpiCreateModalProps {
  isOpen: boolean;
  chain: ProductionChain | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function KpiCreateModal({ isOpen, chain, onClose, onSuccess }: KpiCreateModalProps) {
  const { showSuccessToast, showErrorToast } = useModalToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [totalKPI, setTotalKPI] = useState<number>(0);
  const [kpiBreakdown, setKpiBreakdown] = useState<{
    daily: number;
    weekly: number;
    totalDays: number;
    totalWeeks: number;
    workingDays: number;
  }>({ daily: 0, weekly: 0, totalDays: 0, totalWeeks: 0, workingDays: 0 });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate KPI breakdown excluding weekends
  const calculateKPIBreakdown = (kpi: number, start: string, end: string) => {
    if (!start || !end || kpi <= 0) {
      return { daily: 0, weekly: 0, totalDays: 0, totalWeeks: 0, workingDays: 0 };
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Count working days (exclude weekends)
    let workingDays = 0;
    let totalDays = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      totalDays++;
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
    }

    const totalWeeks = Math.ceil(totalDays / 7);

    // Distribute KPI evenly across working days, with max difference of 1
    const baseDaily = Math.floor(kpi / workingDays);
    const remainder = kpi % workingDays;
    const daily = baseDaily + (remainder > 0 ? 1 : 0); // Show max daily KPI

    const weekly = Math.ceil(kpi / totalWeeks);

    return { daily, weekly, totalDays, totalWeeks, workingDays };
  };

  // Update KPI breakdown when dates or KPI change
  useEffect(() => {
    const breakdown = calculateKPIBreakdown(totalKPI, startDate, endDate);
    setKpiBreakdown(breakdown);
  }, [totalKPI, startDate, endDate]);

  // Calculate end date based on preset
  const calculateEndDate = (preset: string, start: string) => {
    if (!start) return "";
    const startDate = new Date(start);

    switch (preset) {
      case "7-days":
        return new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case "14-days":
        return new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case "30-days":
        return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case "60-days":
        return new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case "90-days":
        return new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case "180-days":
        return new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      case "365-days":
        return new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      default:
        return "";
    }
  };

  // Handle preset selection
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (startDate) {
      const calculatedEndDate = calculateEndDate(preset, startDate);
      setEndDate(calculatedEndDate);
    }
  };

  // Handle start date change
  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (selectedPreset) {
      const calculatedEndDate = calculateEndDate(selectedPreset, date);
      setEndDate(calculatedEndDate);
    }
  };

  // Validate form
  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!startDate) {
      newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
    }

    if (!endDate) {
      newErrors.endDate = "Vui lòng chọn thời gian đến hạn";
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      newErrors.endDate = "Thời gian đến hạn phải sau ngày bắt đầu";
    }

    if (totalKPI <= 0) {
      newErrors.totalKPI = "Vui lòng nhập mục tiêu KPI (lớn hơn 0)";
    }

    // Check for overlapping KPIs
    if (chain && chain.chain_id && startDate && endDate) {
      try {
        const existingKpis = await getChainKpis(chain.chain_id);
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);

        for (const kpi of existingKpis) {
          if (kpi.start_date && kpi.end_date) {
            const existingStart = new Date(kpi.start_date);
            const existingEnd = new Date(kpi.end_date);

            // Check for overlap
            if (newStart <= existingEnd && newEnd >= existingStart) {
              newErrors.overlap = `Thời gian này trùng với KPI hiện có (${existingStart.toLocaleDateString('vi-VN')} - ${existingEnd.toLocaleDateString('vi-VN')})`;
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error checking for overlapping KPIs:', error);
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showErrorToast(`${firstError}`);
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chain) {
      showErrorToast("Không tìm thấy thông tin chuỗi sản xuất");
      return;
    }

    if (!(await validateForm())) {
      return;
    }

    setLoading(true);

    try {
      await createChainKpi(chain.chain_id!, {
        target_value: totalKPI,
        start_date: startDate,
        end_date: endDate
      });

      showSuccessToast("Ban hành KPI thành công!");
      onSuccess?.();
      onClose();

      // Reset form
      setStartDate("");
      setEndDate("");
      setSelectedPreset("");
      setTotalKPI(0);
      setKpiBreakdown({ daily: 0, weekly: 0, totalDays: 0, totalWeeks: 0, workingDays: 0 });
      setErrors({});
    } catch (error: unknown) {
      console.error("Lỗi ban hành KPI:", error);

      let errorMessage = "Lỗi ban hành KPI. Vui lòng thử lại.";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      showErrorToast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStartDate("");
      setEndDate("");
      setSelectedPreset("");
      setTotalKPI(0);
      setKpiBreakdown({ daily: 0, weekly: 0, totalDays: 0, totalWeeks: 0, workingDays: 0 });
      setErrors({});
    }
  }, [isOpen]);

  // Handle escape key and click outside to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !chain) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6 animate-in fade-in duration-200">
      <div ref={modalRef} className="w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-orange-100 to-orange-200 px-8 py-6 border-b border-orange-100 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-orange-800">Ban Hành KPI</h2>
            <p className="text-orange-600 text-sm mt-1">Thiết lập mục tiêu KPI cho chuỗi sản xuất</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-orange-600 hover:bg-orange-100 hover:text-orange-800 transition-all duration-200"
            aria-label="Đóng"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form className="p-8 space-y-8">
            {/* Chain Info */}
            <div className="bg-gradient-to-r from-white to-orange-50 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{chain.name}</h3>
                  <p className="text-sm text-orange-600">Chuỗi sản xuất</p>
                </div>
              </div>
            </div>

            {/* Time Period Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-300 to-orange-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-700" />
                  Thời Hạn Hoàn Thành
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Preset Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Chọn Khoảng Thời Gian
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                    {[
                      { value: "7-days", label: "7 Ngày" },
                      { value: "14-days", label: "14 Ngày" },
                      { value: "30-days", label: "30 Ngày" },
                      { value: "60-days", label: "60 Ngày" },
                      { value: "90-days", label: "90 Ngày" },
                      { value: "180-days", label: "180 Ngày" },
                      { value: "365-days", label: "365 Ngày" }
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handlePresetChange(preset.value)}
                        className={`p-3 rounded-lg border-2 text-xs font-medium transition-all duration-200 ${
                          selectedPreset === preset.value
                            ? "border-orange-400 bg-orange-50 text-orange-700"
                            : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50 text-gray-700"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Ngày Bắt Đầu <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className={`w-full rounded-xl border-2 px-4 py-3.5 text-base font-medium transition-all duration-300 cursor-pointer shadow-sm ${
                          errors.startDate
                            ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200 focus:shadow-red-100"
                            : "border-gray-200 bg-gradient-to-r from-white to-gray-50/50 hover:border-orange-300 hover:shadow-orange-100 focus:border-orange-400 focus:ring-orange-200 focus:shadow-orange-100 focus:bg-orange-50/30"
                        } focus:outline-none focus:ring-2 group-hover:shadow-lg`}
                        required
                      />
                    </div>
                    {startDate && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-700 font-medium flex items-center gap-2">
                          <span className="text-lg">📅</span>
                          {new Date(startDate).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    {errors.startDate && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        {errors.startDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Thời Gian Đến Hạn <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={`w-full rounded-xl border-2 px-4 py-3.5 text-base font-medium transition-all duration-300 cursor-pointer shadow-sm ${
                          errors.endDate
                            ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200 focus:shadow-red-100"
                            : "border-gray-200 bg-gradient-to-r from-white to-gray-50/50 hover:border-orange-300 hover:shadow-orange-100 focus:border-orange-400 focus:ring-amber-200 focus:shadow-amber-100 focus:bg-amber-50/30"
                        } focus:outline-none focus:ring-2 group-hover:shadow-lg`}
                        required
                      />
                    </div>
                    {endDate && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
                          <span className="text-lg">🎯</span>
                          {new Date(endDate).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    {errors.endDate && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        {errors.endDate}
                      </p>
                    )}
                    {errors.overlap && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        {errors.overlap}
                      </p>
                    )}
                  </div>
                </div>

                {/* KPI Target */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Mục Tiêu KPI <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={totalKPI || ""}
                      onChange={(e) => setTotalKPI(Number(e.target.value) || 0)}
                      placeholder="Ví dụ: 30"
                      min="1"
                      className={`w-full rounded-xl border-2 px-4 py-3.5 text-base font-medium transition-all duration-300 shadow-sm [appearance-none] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        errors.totalKPI
                          ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200 focus:shadow-red-100"
                          : "border-gray-200 bg-gradient-to-r from-white to-gray-50/50 hover:border-amber-300 hover:shadow-amber-100 focus:border-amber-400 focus:ring-amber-200 focus:shadow-amber-100 focus:bg-amber-50/30"
                      } focus:outline-none focus:ring-2`}
                      required
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm font-medium text-gray-500">KPI</span>
                    </div>
                  </div>
                  {errors.totalKPI && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.totalKPI}
                    </p>
                  )}
                </div>

                {/* Duration Preview */}
                {startDate && endDate && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700">
                      <CheckCircle className="w-5 h-5 text-amber-700" />
                      <span className="font-medium">Thời hạn KPI:</span>
                    </div>
                    <p className="text-sm text-amber-600">
                      Từ {new Date(startDate).toLocaleDateString('vi-VN')} đến {new Date(endDate).toLocaleDateString('vi-VN')}
                      <span className="ml-2 font-medium">
                        ({kpiBreakdown.totalDays} ngày)
                      </span>
                    </p>

                    {totalKPI > 0 && startDate && endDate && (
                      <div className="border-t border-amber-200 pt-3">
                        <div className="flex items-center gap-2 text-amber-700 mb-2">
                          <span className="text-lg">📊</span>
                          <span className="font-medium">Phân Bổ KPI:</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-white/50 rounded-lg p-3">
                            <div className="text-amber-700 font-medium">Theo Ngày</div>
                            <div className="text-lg font-bold text-amber-800">{kpiBreakdown.daily} KPI/ngày</div>
                          </div>
                          <div className="bg-white/50 rounded-lg p-3">
                            <div className="text-amber-700 font-medium">Theo Tuần</div>
                            <div className="text-lg font-bold text-amber-800">{kpiBreakdown.weekly} KPI/tuần</div>
                          </div>
                        </div>
                        <p className="text-xs text-amber-600 mt-2">
                          Tổng KPI: <strong>{totalKPI}</strong> | Thời gian: <strong>{kpiBreakdown.totalWeeks} tuần</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Always at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className={`inline-flex items-center rounded-full overflow-hidden shadow-sm transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ background: 'linear-gradient(90deg, #fb923c 0%, #fb7a2d 100%)' }}
            >
              {loading ? (
                <>
                  <span className="px-4 py-2 text-2sm font-medium text-white">Đang Tạo Chuỗi...</span>
                  <span className="w-7 h-7 mr-1 bg-white flex items-center justify-center rounded-full">
                    <div className="w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                  </span>
                </>
              ) : (
                <>
                  <span className="px-4 py-2 text-2sm font-medium text-white">Tạo Chuỗi Sản Xuất</span>
                  <span className="w-7 h-7 mr-1 bg-white flex items-center justify-center rounded-full">
                    <CheckCircle className="w-4 h-4 text-orange-500" />
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
