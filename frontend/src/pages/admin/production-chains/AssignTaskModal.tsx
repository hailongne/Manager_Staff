import { useState } from "react";

interface Department {
  department_id: number;
  name: string;
}

interface Chain {
  productName: string;
  departmentIds: number[];
}

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  chain: Chain;
  departmentById: Map<number, Department>;
  submitting?: boolean;
}

interface TaskFormData {
  title: string;
  quantity: number;
  unitLabel: string;
  topic: string;
  weekIndex: number;
  description: string;
  dueDate: string;
}

const initialForm: TaskFormData = {
  title: "",
  quantity: 1,
  unitLabel: "",
  topic: "",
  weekIndex: 1,
  description: "",
  dueDate: "",
};

export function AssignTaskModal({
  isOpen,
  onClose,
  onSubmit,
  chain,
  departmentById,
  submitting = false,
}: AssignTaskModalProps) {
  const [form, setForm] = useState<TaskFormData>(initialForm);

  const onFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "weekIndex" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const resetForm = () => {
    setForm(initialForm);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        style={{ maxHeight: "calc(100vh - 3rem)" }}
      >
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 bg-gradient-to-r from-pink-500 via-pink-400 to-white px-6 py-4 text-white">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Giao nhiệm vụ cho chuỗi</h3>
              <p className="text-sm text-white/85">{chain.productName}</p>
              <p className="text-xs text-white/75">
                Phòng ban tham gia:{" "}
                {chain.departmentIds
                  .map((id, index) => {
                    const dept = departmentById.get(id)?.name ?? `#${id}`;
                    return `${index + 1}. ${dept}`;
                  })
                  .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/30"
            >
              Đóng
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nhiệm vụ</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={onFieldChange}
                placeholder="Ví dụ: Chuẩn bị outline kịch bản"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Số lượng giao</label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={onFieldChange}
                  placeholder="Ví dụ: 120"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Đơn vị tính</label>
                <input
                  type="text"
                  name="unitLabel"
                  value={form.unitLabel}
                  onChange={onFieldChange}
                  placeholder="Ví dụ: sản phẩm, video, bài viết"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Chủ đề / Hạng mục</label>
              <input
                type="text"
                name="topic"
                value={form.topic}
                onChange={onFieldChange}
                placeholder="Ví dụ: Chủ đề Tết, bộ sản phẩm A"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tuần thực hiện (1-5)</label>
              <input
                type="number"
                name="weekIndex"
                value={form.weekIndex}
                onChange={onFieldChange}
                min={1}
                max={5}
                placeholder="Ví dụ: 2"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Chi tiết nhiệm vụ</label>
              <textarea
                name="description"
                value={form.description}
                onChange={onFieldChange}
                placeholder="Mô tả cụ thể yêu cầu, tài nguyên đi kèm..."
                className="mt-1 h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Hạn hoàn thành</label>
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={onFieldChange}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-pink-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-600"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Đang giao..." : "Giao nhiệm vụ"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}