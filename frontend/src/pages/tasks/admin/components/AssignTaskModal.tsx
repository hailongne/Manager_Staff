import { useState, useEffect } from "react";
import { useModalToast } from "../../../../hooks/useToast";
import type { AssignTaskModalProps, Task } from "../types";

export function AssignTaskModal({
  users,
  defaultUserId,
  onAssign,
  onClose
}: AssignTaskModalProps) {
  const [assignedUserId, setAssignedUserId] = useState(
    () => defaultUserId ?? (users[0]?.user_id?.toString() ?? "")
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const toast = useModalToast();

  useEffect(() => {
    if (!assignedUserId) {
      setAssignedUserId(defaultUserId ?? (users[0]?.user_id?.toString() ?? ""));
    }
  }, [assignedUserId, defaultUserId, users]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.showErrorToast("Vui lòng nhập tiêu đề nhiệm vụ");
      return;
    }
    if (!assignedUserId) {
      toast.showErrorToast("Vui lòng chọn nhân viên được giao");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Task> = {
        title: title.trim(),
        user_id: Number(assignedUserId)
      };
      if (description.trim()) payload.description = description.trim();
      if (date) payload.date = date;

      await onAssign(payload);
      toast.showSuccessToast("Đã giao nhiệm vụ thành công!");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể giao nhiệm vụ";
      toast.showErrorToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-pink-100/40 flex items-center justify-center z-50"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-gradient-to-r from-pink-100 via-pink-50 to-white px-6 py-4 border-b border-pink-100">
        <h2 className="text-lg font-semibold text-pink-600">Giao nhiệm vụ cho nhân viên</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-pink-600 mb-2">
              Chọn nhân viên <span className="text-red-600">*</span>
            </label>
            <select
              value={assignedUserId}
              onChange={(event) => setAssignedUserId(event.target.value)}
              className="ms-select w-full"
              disabled={submitting || users.length === 0}
            >
              <option value="" disabled>
                {users.length === 0 ? "Chưa có nhân viên" : "-- Chọn nhân viên --"}
              </option>
              {users.map((item) => (
                <option key={item.user_id} value={item.user_id}>
                  {item.name} ({item.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-pink-600 mb-2">
              Tiêu đề nhiệm vụ <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="Nhập tiêu đề nhiệm vụ"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pink-600 mb-2">Ngày thực hiện</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pink-600 mb-2">Mô tả</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
              placeholder="Thêm hướng dẫn chi tiết (không bắt buộc)"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition disabled:opacity-60"
              disabled={submitting || users.length === 0}
            >
              {submitting ? "Đang giao..." : "Giao nhiệm vụ"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white text-pink-600 border border-pink-200 px-4 py-2 rounded-lg hover:bg-pink-50 transition"
              disabled={submitting}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
