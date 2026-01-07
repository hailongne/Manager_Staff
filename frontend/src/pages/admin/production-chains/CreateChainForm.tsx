import { useState, useEffect } from "react";
import { createProductionChain } from "../../../api/productionChains";
import type { ProductionChainStep } from "../../../api/productionChains";
import { getDepartments } from "../../../api/departments";
import { useModalToast } from "../../../hooks/useToast";
import { Trash2, ArrowRight, Users, FileText, CheckCircle, Rocket } from "lucide-react";

interface Department {
  department_id: number;
  name: string;
}

interface CreateChainFormProps {
  onChainCreated: () => void;
  hasCompletions?: boolean;
}

export function CreateChainForm({ onChainCreated, hasCompletions = false }: CreateChainFormProps) {
  const { showSuccessToast, showErrorToast } = useModalToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<ProductionChainStep[]>([
    { step_order: 1, department_id: 0, title: "" }
  ]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form on mount
  useEffect(() => {
    // Reset form for new chain
    setName("");
    setDescription("");
    setSteps([{ step_order: 1, department_id: 0, title: "" }]);
    setErrors({});
  }, []);

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Tên chuỗi không được để trống";
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
      title: ""
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
      // Create new chain
      await createProductionChain({
        name: name.trim(),
        description: description.trim(),
        steps: steps
          .sort((a, b) => a.step_order - b.step_order)
          .map(s => ({
            step_order: s.step_order,
            department_id: s.department_id,
            title: s.title.trim()
          }))
      });

      // Reset form
      setName("");
      setDescription("");
      setSteps([{ step_order: 1, department_id: 0, title: "" }]);
      setErrors({});

      // Notify parent to reload chains
      onChainCreated();
      
      // Show success toast
      showSuccessToast("Tạo chuỗi sản xuất thành công!");
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
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 bg-gradient-to-br from-orange-300 to-orange-200`}>
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tạo Chuỗi Sản Xuất Mới
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Xây dựng quy trình sản xuất có hệ thống với nhiều phòng ban tham gia theo thứ tự logic
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-300 to-orange-200 px-6 py-4">
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
                    : "border-gray-200 bg-gray-50 focus:border-orange-400 focus:ring-orange-200 focus:bg-white"
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
                    : "border-gray-200 bg-gray-50 focus:border-orange-400 focus:ring-orange-200 focus:bg-white"
                } focus:outline-none focus:ring-2`}
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Steps Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-300 to-orange-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                Thứ tự thực hiện theo phòng ban
              </h3>
              <button
                type="button"
                onClick={addStep}
                disabled={hasCompletions}
                className={`inline-flex items-center rounded-full overflow-hidden shadow-sm transition ${hasCompletions ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ background: 'linear-gradient(90deg, #fb923c 0%, #fb7a2d 100%)' }}
              >
                <span className="px-4 py-2 text-2sm font-medium text-white">Thêm phòng ban</span>
                <span className="w-7 h-7 mr-1 bg-white flex items-center justify-center rounded-full">
                  <Rocket className="w-4 h-4 text-orange-500" />
                </span>
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
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-300 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
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
                              : "border-gray-200 bg-white focus:border-orange-400 focus:ring-orange-200"
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
                                : "border-gray-200 bg-white focus:border-orange-400 focus:ring-orange-200"
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
                Sẵn Sàng Tạo Chuỗi?
              </h3>
              <p className="text-sm text-gray-600">
                Chuỗi sẽ bao gồm {steps.length} bước với {steps.filter(s => s.department_id > 0).length} phòng ban tham gia
              </p>
            </div>

            <button
              type="submit"
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
      </form>
    </div>
  );
}