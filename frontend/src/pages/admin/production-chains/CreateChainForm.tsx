import { useState, useEffect } from "react";
import { createProductionChain, updateProductionChain } from "../../../api/productionChains";
import type { ProductionChain, ProductionChainStep } from "../../../api/productionChains";
import { getDepartments } from "../../../api/departments";
import { useModalToast } from "../../../hooks/useToast";
import { Plus, Trash2, ArrowRight, Clock, Users, FileText, CheckCircle } from "lucide-react";

interface Department {
  department_id: number;
  name: string;
}

interface CreateChainFormProps {
  onChainCreated: () => void;
  editingChain?: ProductionChain | null;
  hasCompletions?: boolean;
}

export function CreateChainForm({ onChainCreated, editingChain, hasCompletions = false }: CreateChainFormProps) {
  const { showSuccessToast, showErrorToast } = useModalToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<ProductionChainStep[]>([
    { step_order: 1, department_id: 0, title: "", description: "" }
  ]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (editingChain) {
      setName(editingChain.name);
      setDescription(editingChain.description || "");
      
      // Format dates for input type="date" (YYYY-MM-DD)
      const formatDateForInput = (dateString: string | undefined) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };
      
      setStartDate(formatDateForInput(editingChain.start_date));
      setEndDate(formatDateForInput(editingChain.end_date));
      setTotalKPI(editingChain.total_kpi || 0);
      
      // Try to detect preset based on date difference
      if (editingChain.start_date && editingChain.end_date) {
        const start = new Date(editingChain.start_date);
        const end = new Date(editingChain.end_date);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 7) setSelectedPreset("7-days");
        else if (diffDays === 14) setSelectedPreset("14-days");
        else if (diffDays === 30) setSelectedPreset("30-days");
        else if (diffDays === 60) setSelectedPreset("60-days");
        else if (diffDays === 90) setSelectedPreset("90-days");
        else if (diffDays === 180) setSelectedPreset("180-days");
        else if (diffDays >= 365 && diffDays <= 366) setSelectedPreset("365-days");
        else setSelectedPreset("");
      } else {
        setSelectedPreset("");
      }
      
      setSteps(editingChain.steps.map(step => ({
        ...step,
        department_id: step.department_id,
        title: step.title,
        description: step.description || "",
        step_order: step.step_order
      })));
      
      // Recalculate KPI breakdown
      if (editingChain.start_date && editingChain.end_date && editingChain.total_kpi) {
        const breakdown = calculateKPIBreakdown(editingChain.total_kpi, editingChain.start_date, editingChain.end_date);
        setKpiBreakdown(breakdown);
      }
    } else {
      // Reset form for new chain
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setSelectedPreset("");
      setTotalKPI(0);
      setSteps([{ step_order: 1, department_id: 0, title: "", description: "" }]);
      setKpiBreakdown({ daily: 0, weekly: 0, totalDays: 0, totalWeeks: 0, workingDays: 0 });
      setErrors({});
    }
  }, [editingChain]);

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

  // Load departments on mount
  useEffect(() => {
    getDepartments()
      .then((data) => {
        setDepartments(data);
      })
      .catch((error) => {
        console.error('Error loading departments:', error);
        // Fallback: add some sample departments for testing
        setDepartments([
          { department_id: 1, name: 'Phòng Kỹ Thuật' },
          { department_id: 2, name: 'Phòng Marketing' },
          { department_id: 3, name: 'Phòng Nhân Sự' },
          { department_id: 4, name: 'Phòng Tài Chính' }
        ]);
      });
  }, []);

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
        // More accurate month calculation: add days equivalent to average month length
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Tên chuỗi không được để trống";
    }

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

    steps.forEach((step, index) => {
      if (!step.title.trim()) {
        newErrors[`step_${index}_title`] = "Tiêu đề nhiệm vụ không được để trống";
      }
      if (step.department_id === 0) {
        newErrors[`step_${index}_department`] = "Vui lòng chọn phòng ban";
      }
    });

    // Validate minimum 2 different departments
    const uniqueDepartments = new Set(steps.filter(step => step.department_id > 0).map(step => step.department_id));
    if (uniqueDepartments.size < 2) {
      newErrors.departments = "Chuỗi sản xuất phải có ít nhất 2 phòng ban khác nhau tham gia";
    }

    setErrors(newErrors);
    
    // Show toast for validation errors
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showErrorToast(`${firstError}`);
      return false;
    }
    
    return true;
  };

  const addStep = () => {
    const newStep = {
      step_order: steps.length + 1,
      department_id: 0,
      title: "",
      description: ""
    };
    const newSteps = [...steps, newStep].sort((a, b) => a.step_order - b.step_order);
    setSteps(newSteps);
  };

  const updateStep = (index: number, field: keyof ProductionChainStep, value: string | number) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);

    // Clear error for this field
    if (errors[`step_${index}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`step_${index}_${field}`];
        return newErrors;
      });
    }
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((_, i) => i !== index);
      // Reorder step_order
      newSteps.forEach((step, i) => step.step_order = i + 1);
      // Sort by step_order to maintain correct order
      newSteps.sort((a, b) => a.step_order - b.step_order);
      setSteps(newSteps);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (editingChain) {
        // Update existing chain
        await updateProductionChain(editingChain.chain_id!, {
          name: name.trim(),
          description: description.trim(),
          start_date: startDate,
          end_date: endDate,
          total_kpi: totalKPI,
          steps: steps
            .sort((a, b) => a.step_order - b.step_order)
            .map(s => ({
              step_order: s.step_order,
              department_id: s.department_id,
              title: s.title.trim(),
              description: s.description?.trim() || ""
            }))
        });
      } else {
        // Create new chain
        await createProductionChain({
          name: name.trim(),
          description: description.trim(),
          start_date: startDate,
          end_date: endDate,
          total_kpi: totalKPI,
          steps: steps
            .sort((a, b) => a.step_order - b.step_order)
            .map(s => ({
              step_order: s.step_order,
              department_id: s.department_id,
              title: s.title.trim(),
              description: s.description?.trim() || ""
            }))
        });
      }

      // Reset form
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setSelectedPreset("");
      setTotalKPI(0);
      setKpiBreakdown({ daily: 0, weekly: 0, totalDays: 0, totalWeeks: 0, workingDays: 0 });
      setSteps([{ step_order: 1, department_id: 0, title: "", description: "" }]);
      setErrors({});

      // Notify parent to reload chains
      onChainCreated();
      
      // Show success toast
      showSuccessToast(editingChain ? "Cập nhật chuỗi sản xuất thành công!" : "Tạo chuỗi sản xuất thành công!");
    } catch (error: unknown) {
      console.error("Lỗi tạo/cập nhật chuỗi sản xuất:", error);
      
      // Show error toast with specific message
      let errorMessage = "Lỗi tạo/cập nhật chuỗi sản xuất. Vui lòng thử lại.";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      showErrorToast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 ${editingChain ? 'bg-gradient-to-br from-amber-300 to-orange-300' : 'bg-gradient-to-br from-pink-300 to-rose-300'}`}>
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {editingChain ? 'Chỉnh Sửa Chuỗi Sản Xuất' : 'Tạo Chuỗi Sản Xuất Mới'}
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {editingChain 
            ? 'Cập nhật thông tin và các bước thực hiện của chuỗi sản xuất'
            : 'Xây dựng quy trình sản xuất có hệ thống với nhiều phòng ban tham gia theo thứ tự logic'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Top Row: Basic Information + Deadline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Information Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-300 to-rose-300 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Thông Tin Cơ Bản
              </h3>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên Chuỗi Sản Xuất <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Chuỗi sản xuất nội dung"
                  className={`w-full rounded-xl border px-4 py-3 text-sm transition-all duration-200 ${
                    errors.name
                      ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 bg-gray-50 focus:border-pink-400 focus:ring-pink-200 focus:bg-white"
                  } focus:outline-none focus:ring-2`}
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mô Tả Chi Tiết
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả mục tiêu, phạm vi và kết quả mong đợi của chuỗi sản xuất..."
                  className={`w-full rounded-xl border px-4 py-3 text-sm transition-all duration-200 resize-none ${
                    errors.description
                      ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 bg-gray-50 focus:border-pink-400 focus:ring-pink-200 focus:bg-white"
                  } focus:outline-none focus:ring-2`}
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Deadline Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-300 to-teal-300 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
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
                      disabled={hasCompletions}
                      className={`p-3 rounded-lg border-2 text-xs font-medium transition-all duration-200 ${hasCompletions ? 'opacity-50 cursor-not-allowed' : ''} ${
                        selectedPreset === preset.value
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 text-gray-700"
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
                      disabled={hasCompletions}
                      className={`w-full rounded-xl border-2 px-4 py-3.5 text-base font-medium transition-all duration-300 cursor-pointer shadow-sm ${hasCompletions ? 'opacity-50 cursor-not-allowed' : ''} ${
                        errors.startDate
                          ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200 focus:shadow-red-100"
                          : "border-gray-200 bg-gradient-to-r from-white to-gray-50/50 hover:border-emerald-300 hover:shadow-emerald-100 focus:border-emerald-400 focus:ring-emerald-200 focus:shadow-emerald-100 focus:bg-emerald-50/30"
                      } focus:outline-none focus:ring-2 group-hover:shadow-lg`}
                      required
                    />
                  </div>
                  {startDate && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
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
                      disabled={hasCompletions}
                      className={`w-full rounded-xl border-2 px-4 py-3.5 text-base font-medium transition-all duration-300 cursor-pointer shadow-sm ${hasCompletions ? 'opacity-50 cursor-not-allowed' : ''} ${
                        errors.endDate
                          ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200 focus:shadow-red-100"
                          : "border-gray-200 bg-gradient-to-r from-white to-gray-50/50 hover:border-emerald-300 hover:shadow-emerald-100 focus:border-emerald-400 focus:ring-emerald-200 focus:shadow-emerald-100 focus:bg-emerald-50/30"
                      } focus:outline-none focus:ring-2 group-hover:shadow-lg`}
                      required
                    />
                  </div>
                  {endDate && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
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
                    disabled={hasCompletions}
                    placeholder="Ví dụ: 30"
                    min="1"
                    className={`w-full rounded-xl border-2 px-4 py-3.5 text-base font-medium transition-all duration-300 shadow-sm [appearance-none] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${hasCompletions ? 'opacity-50 cursor-not-allowed' : ''} ${
                      errors.totalKPI
                        ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200 focus:shadow-red-100"
                        : "border-gray-200 bg-gradient-to-r from-white to-gray-50/50 hover:border-emerald-300 hover:shadow-emerald-100 focus:border-emerald-400 focus:ring-emerald-200 focus:shadow-emerald-100 focus:bg-emerald-50/30"
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
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Thời hạn chuỗi:</span>
                  </div>
                  <p className="text-sm text-emerald-600">
                    Từ {new Date(startDate).toLocaleDateString('vi-VN')} đến {new Date(endDate).toLocaleDateString('vi-VN')}
                    <span className="ml-2 font-medium">
                      ({kpiBreakdown.totalDays} ngày)
                    </span>
                  </p>

                  {totalKPI > 0 && startDate && endDate && (
                    <div className="border-t border-emerald-200 pt-3">
                      <div className="flex items-center gap-2 text-emerald-700 mb-2">
                        <span className="text-lg">📊</span>
                        <span className="font-medium">Phân Bổ KPI:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white/50 rounded-lg p-3">
                          <div className="text-emerald-700 font-medium">Theo Ngày</div>
                          <div className="text-lg font-bold text-emerald-800">{kpiBreakdown.daily} KPI/ngày</div>
                        </div>
                        <div className="bg-white/50 rounded-lg p-3">
                          <div className="text-emerald-700 font-medium">Theo Tuần</div>
                          <div className="text-lg font-bold text-emerald-800">{kpiBreakdown.weekly} KPI/tuần</div>
                        </div>
                      </div>
                      <p className="text-xs text-emerald-600 mt-2">
                        Tổng KPI: <strong>{totalKPI}</strong> | Thời gian: <strong>{kpiBreakdown.totalWeeks} tuần</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Steps Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-sky-300 to-indigo-300 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                Thứ tự thực hiện theo phòng ban
              </h3>
              <button
                type="button"
                onClick={addStep}
                disabled={hasCompletions}
                className={`inline-flex items-center justify-center transition-opacity duration-200
                  ${hasCompletions ? 'opacity-40 cursor-not-allowed' : 'text-white hover:opacity-80'}
                `}
              >
                <Plus size={28} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {errors.departments && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.departments}
                </p>
              </div>
            )}
            <div className="space-y-6">
              {steps
                .sort((a, b) => a.step_order - b.step_order)
                .map((step, index) => (
                <div key={index} className="relative">
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {step.step_order}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Bước {step.step_order}</h4>
                        <p className="text-sm text-gray-500">Định nghĩa nhiệm vụ cho bước này</p>
                      </div>
                    </div>

                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        disabled={hasCompletions}
                        className={`p-2 rounded-lg transition-colors duration-200 ${hasCompletions ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-red-500 hover:bg-red-50'}`}
                        title="Xóa bước này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Step Form */}
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          Phòng Ban Thực Hiện <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={step.department_id}
                          onChange={(e) => updateStep(index, 'department_id', Number(e.target.value))}
                          disabled={hasCompletions}
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-all duration-200 ${hasCompletions ? 'opacity-50 cursor-not-allowed' : ''} ${
                            errors[`step_${index}_department`]
                              ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
                              : "border-gray-200 bg-white focus:border-blue-400 focus:ring-blue-200"
                          } focus:outline-none focus:ring-2`}
                          required
                        >
                          <option value={0}>Chọn phòng ban</option>
                          {departments.map(dept => (
                            <option key={dept.department_id} value={dept.department_id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                        {errors[`step_${index}_department`] && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {errors[`step_${index}_department`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          Tiêu Đề Nhiệm Vụ <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(index, 'title', e.target.value)}
                          placeholder="Ví dụ: Thiết kế banner quảng cáo"
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-all duration-200 ${
                            errors[`step_${index}_title`]
                              ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
                              : "border-gray-200 bg-white focus:border-blue-400 focus:ring-blue-200"
                          } focus:outline-none focus:ring-2`}
                          required
                        />
                        {errors[`step_${index}_title`] && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {errors[`step_${index}_title`]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mô Tả Chi Tiết Công Việc
                      </label>
                      <textarea
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        placeholder="Mô tả cụ thể các yêu cầu, đầu ra và tiêu chí đánh giá..."
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:ring-blue-200 focus:outline-none focus:ring-2 transition-all duration-200 resize-none"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Connection Arrow */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center my-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <ArrowRight className="w-5 h-5" />
                        <span className="text-sm font-medium">Chuyển sang bước tiếp theo</span>
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {steps.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Chưa có bước nào. Hãy thêm bước đầu tiên!</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {editingChain ? 'Sẵn Sàng Cập Nhật?' : 'Sẵn Sàng Tạo Chuỗi?'}
              </h3>
              <p className="text-sm text-gray-600">
                Chuỗi sẽ bao gồm {steps.length} bước với {steps.filter(s => s.department_id > 0).length} phòng ban tham gia
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center gap-3 text-white px-8 py-4 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                editingChain 
                  ? 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-400 disabled:to-gray-500'
                  : 'bg-gradient-to-r from-pink-300 to-rose-300 hover:from-pink-200 hover:to-rose-200 disabled:from-gray-400 disabled:to-gray-500'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {editingChain ? 'Đang Cập Nhật...' : 'Đang Tạo Chuỗi...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  {editingChain ? 'Cập Nhật Chuỗi' : 'Tạo Chuỗi Sản Xuất'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}