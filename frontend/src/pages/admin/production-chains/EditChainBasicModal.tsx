import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { updateProductionChain } from "../../../api/productionChains";
import type { ProductionChain, ProductionChainStep } from "../../../api/productionChains";
import { getDepartments } from "../../../api/departments";
import type { Department } from "../../../api/departments";
import { useModalToast } from "../../../hooks/useToast";
import { useAuth } from "../../../hooks/useAuth";
import type { KpiCompletionState } from "./types";
import { isWeekendDay } from "./hooks/useProductionChains";

interface EditChainBasicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chain: ProductionChain | null;
  kpiCompletionState: KpiCompletionState;
}

interface UpdateChainPayload {
  name: string;
  description?: string;
  steps: {
    step_order: number;
    department_id: number;
    title: string;
  }[];
}

type EditPermission = 'UNKNOWN' | 'ALLOWED' | 'LOCKED';

export function EditChainBasicModal({ isOpen, onClose, onSuccess, chain, kpiCompletionState }: EditChainBasicModalProps) {
  const { showSuccessToast, showErrorToast } = useModalToast();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<ProductionChainStep[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [editPermission, setEditPermission] = useState<EditPermission>('UNKNOWN');

  // Check if chain has completed KPIs (has completion records, excluding weekends)
  const hasCompletedKpi = useCallback(() => {
    if (!chain || !chain.chain_id) return false;

    return Object.values(kpiCompletionState).some(entry => {
      return (
        entry.chain_id === chain.chain_id &&
        entry.days &&
        entry.days.some(day => !isWeekendDay(day))
      );
    });
  }, [chain, kpiCompletionState]);

  const loadDepartments = async () => {
    try {
      const depts = await getDepartments();
      setDepartments(depts);
    } catch (error) {
      console.error("Lỗi tải danh sách phòng ban:", error);
    }
  };

  useEffect(() => {
    if (isOpen && chain) {

      setName(chain.name);
      setDescription(chain.description || "");
      setSteps([...chain.steps]);

      loadDepartments();
      
      // Set edit permission based on user role and KPI completion status
      const isAdmin = user?.role === 'admin';
      const locked = !isAdmin || hasCompletedKpi();
      setEditPermission(locked ? 'LOCKED' : 'ALLOWED');
    }
  }, [isOpen, chain, hasCompletedKpi, user]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const addStep = () => {
    const newStep: ProductionChainStep = {
      step_order: steps.length + 1,
      department_id: 0,
      title: ""
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, field: keyof ProductionChainStep, value: string | number) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Reorder step_order
    newSteps.forEach((step, i) => step.step_order = i + 1);
    setSteps(newSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chain?.chain_id) return;

    if (!name.trim()) {
      showErrorToast("Tên chuỗi sản xuất là bắt buộc");
      return;
    }

    // Validate steps only if editing is allowed
    if (editPermission === 'ALLOWED') {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step.title.trim()) {
          showErrorToast(`Bước ${i + 1}: Tiêu đề là bắt buộc`);
          return;
        }
        if (!step.department_id) {
          showErrorToast(`Bước ${i + 1}: Phòng ban là bắt buộc`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      // Build payload based on edit permission - business rule enforcement
      const payload: UpdateChainPayload = {
        name: name.trim(),
        description: description.trim(),
        // CRITICAL: If LOCKED, preserve step_order and department_id but allow title updates
        steps: editPermission === 'LOCKED'
          ? chain.steps.map((originalStep: ProductionChainStep, index: number) => ({
              step_order: originalStep.step_order,
              department_id: originalStep.department_id,
              title: steps[index]?.title?.trim() || originalStep.title.trim()
            }))
          : steps.map(step => ({
              step_order: step.step_order,
              department_id: step.department_id,
              title: step.title.trim()
            }))
      };

      await updateProductionChain(chain.chain_id, payload);
      showSuccessToast("Cập nhật chuỗi sản xuất thành công");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Lỗi cập nhật chuỗi sản xuất:", error);
      showErrorToast("Có lỗi xảy ra khi cập nhật chuỗi sản xuất");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !chain) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-sky-100 overflow-hidden flex flex-col">
        <header className="bg-gradient-to-r from-yellow-100 via-yellow-50 to-yellow-200 px-6 py-4 border-b border-yellow-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-yellow-800">
            Chỉnh sửa chuỗi sản xuất
            {editPermission === 'LOCKED' && (
              <span className="text-sm font-normal text-orange-600 ml-2">
                (Chuỗi đã có KPI hoàn thành - Chỉ có thể chỉnh sửa tên, mô tả và chi tiết bước)
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-500">Chỉnh sửa chuỗi sản xuất cho phép cập nhật tên và mô tả, còn thời hạn và các bước sẽ bị khóa khi đã có KPI hoàn thành.</p>
        </header>

        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên Chuỗi Sản Xuất <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô Tả Chi Tiết
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            {/* Steps Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900">Thứ tự thực hiện theo phòng ban</h4>
                {editPermission === 'ALLOWED' && (
                    <button
                    type="button"
                    onClick={addStep}
                    className="px-3 py-1 text-yellow-700 hover:text-yellow-900 rounded-md icon-size-20 flex items-center justify-center"
                    >
                    <Plus size={24} />
                    </button>
                )}
              </div>

              {editPermission === 'LOCKED' && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <p className="text-sm text-orange-800">
                    Chuỗi sản xuất này đã có KPI hoàn thành, không thể chỉnh sửa thứ tự bước, phòng ban và thời hạn. Vẫn có thể chỉnh sửa tiêu đề và mô tả của các bước.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                  key={index}
                  className="relative rounded-l-lg p-4 bg-white border-t-2 border-b-2 border-l border-gray-200"
                  >
                  <span
                  className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-yellow-400"
                  />
                  <div className="flex items-center justify-between mb-3">
                  <h5 className="flex items-center gap-2 font-medium text-gray-900">
                  <span className="w-7 h-7 rounded-full bg-yellow-400 text-white text-sm flex items-center justify-center">
                  {step.step_order}
                  </span>
                  Phòng ban giai đoạn {step.step_order}
                  </h5>
                  {editPermission === 'ALLOWED' && steps.length > 1 && (
                  <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="text-red-500 hover:text-red-700"
                  >
                  <Trash2 size={16} />
                  </button>
                  )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề bước <span className="text-red-500">*</span>
                  </label>
                  <input
                  type="text"
                  value={step.title}
                  onChange={(e) => updateStep(index, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                  />
                  </div>

                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phòng ban thực hiện <span className="text-red-500">*</span>
                  </label>
                  <select
                  value={step.department_id}
                  onChange={(e) => updateStep(index, 'department_id', parseInt(e.target.value))}
                  disabled={editPermission === 'LOCKED'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white disabled:bg-gray-100"
                  required
                  >
                  <option value={0} className="text-gray-500">Chọn phòng ban</option>
                  {departments.map(dept => (
                  <option
                  key={dept.department_id}
                  value={dept.department_id}
                  title={dept.description ? `${dept.name} - ${dept.description}` : dept.name}
                  >
                  {dept.name}
                  {dept.manager ? ` (QL: ${dept.manager.name})` : ''}
                  </option>
                  ))}
                  </select>
                  </div>
                  </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <footer className="bg-gradient-to-r from-yellow-100 via-yellow-50 to-white px-6 py-4 border-t border-yellow-100">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md disabled:opacity-50"
              disabled={loading}
            >
              {loading
                ? "Đang cập nhật..."
                : editPermission === 'LOCKED'
                  ? "Cập nhật thông tin"
                  : "Cập nhật"
              }
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}