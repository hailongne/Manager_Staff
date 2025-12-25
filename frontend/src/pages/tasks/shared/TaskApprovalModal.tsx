import { useState, useEffect, useMemo, useRef } from "react";
import type { Task, TaskUpdatePayload } from "../../../api/tasks";
import type { User as ApiUser } from "../../../api/users";
import { useModalToast } from "../../../hooks/useToast";

export type TaskApprovalModalProps = {
  task: Task;
  owner?: ApiUser;
  onApprove: (updates: TaskUpdatePayload) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onClose: () => void;
};

const actionLabels: Record<string, string> = {
  update: "Nhân viên đề xuất chỉnh sửa",
  cancel: "Nhân viên đề xuất hủy nhiệm vụ",
  create: "Nhân viên đề xuất tạo nhiệm vụ"
};

export function TaskApprovalModal({ task, owner, onApprove, onReject, onClose }: TaskApprovalModalProps) {
  const isMounted = useRef(true);
  const toast = useModalToast();
  const [saving, setSaving] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingActionType, setPendingActionType] = useState<"approve" | "reject" | null>(null);
  const [form, setForm] = useState<TaskUpdatePayload>(() => ({
    title: task.title,
    description: task.description ?? "",
    result_link: task.result_link ?? "",
    status: task.status,
    date: task.date ? String(task.date).split("T")[0] : new Date().toISOString().slice(0, 10),
    cancel_reason: task.cancel_reason ?? ""
  }));

  const changeEntries = useMemo(() => Object.entries(task.pending_changes ?? {}), [task.pending_changes]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTitle = form.title?.trim();
    if (!trimmedTitle) {
      toast.showErrorToast("Vui lòng nhập tiêu đề nhiệm vụ");
      return;
    }
    if (!form.date) {
      toast.showErrorToast("Vui lòng chọn ngày thực hiện");
      return;
    }

    setPendingActionType("approve");
    setSaving(true);
    try {
      await onApprove({ ...form, title: trimmedTitle });
      toast.showSuccessToast("Đã phê duyệt nhiệm vụ thành công!");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể phê duyệt nhiệm vụ";
      if (isMounted.current) {
        toast.showErrorToast(message);
      }
    } finally {
      if (isMounted.current) {
        setSaving(false);
        setPendingActionType(null);
      }
    }
  };

  const handleReject = async () => {
    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      toast.showErrorToast("Vui lòng nhập lý do từ chối phê duyệt");
      return;
    }

    setPendingActionType("reject");
    setSaving(true);
    try {
      await onReject(trimmedReason);
      toast.showSuccessToast("Đã từ chối yêu cầu thành công!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể từ chối nhiệm vụ";
      if (isMounted.current) {
        toast.showErrorToast(message);
      }
    } finally {
      if (isMounted.current) {
        setSaving(false);
        setPendingActionType(null);
      }
    }
  };

  const ownerLabel = owner ? `${owner.name} (${owner.email})` : `Nhân viên #${task.user_id}`;
  const requestedAt = task.updated_at || task.created_at;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-pink-100 w-full max-w-3xl max-h-[90vh] flex flex-col">

        <div className="px-6 py-4 border-b border-pink-100 bg-gradient-to-r from-pink-50 via-white to-pink-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-pink-600">Phê duyệt nhiệm vụ</h2>
              <p className="text-xs text-gray-500">{actionLabels[task.pending_action ?? "update"]}</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-600 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              Chờ phê duyệt
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-pink-600 mb-2">Người yêu cầu</h3>
              <p className="text-sm text-gray-700">{ownerLabel}</p>
            </div>
            <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-pink-600 mb-2">Thời gian</h3>
              <p className="text-sm text-gray-700">{requestedAt ? new Date(requestedAt).toLocaleString("vi-VN") : "Không xác định"}</p>
            </div>
          </div>

          <div className="bg-white border border-pink-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-pink-600 mb-2">Lý do nhân viên</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{task.pending_reason?.trim() || "Nhân viên không cung cấp lý do"}</p>
          </div>

          {changeEntries.length > 0 ? (
            <div className="bg-white border border-pink-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-pink-600 mb-2">Nội dung nhân viên đề xuất</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {changeEntries.map(([key, value]) => {
                  if (key === "previous_status") return null;
                  const labelMap: Record<string, string> = {
                    title: "Tiêu đề mới",
                    description: "Mô tả mới",
                    result_link: "Link kết quả mới",
                    status: "Trạng thái đề xuất",
                    cancel_reason: "Lý do hủy đề xuất",
                    date: "Ngày thực hiện đề xuất"
                  };
                  const label = labelMap[key] ?? key;
                  return (
                    <li key={key}>
                      <strong className="text-pink-600">{label}:</strong> {String(value)}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-pink-500 mb-1">
                  Tiêu đề nhiệm vụ <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={form.title ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                  disabled={task.pending_action === "cancel"}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pink-500 mb-1">
                  Ngày thực hiện <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={form.date ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                  disabled={task.pending_action === "cancel"}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-pink-500 mb-1">Mô tả</label>
              <textarea
                value={form.description ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                rows={3}
                disabled={task.pending_action === "cancel"}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-pink-500 mb-1">Link kết quả (nếu có)</label>
                <input
                  type="url"
                  value={form.result_link ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, result_link: event.target.value }))}
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="https://..."
                  disabled={task.pending_action === "cancel"}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pink-500 mb-1">Trạng thái sau phê duyệt</label>
                <select
                  value={form.status ?? "in_progress"}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as Task["status"] }))}
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                  disabled={task.pending_action === "cancel"}
                >
                  <option value="in_progress">Đang làm</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Hủy</option>
                </select>
              </div>
            </div>

            {task.pending_action === "cancel" ? (
              <div>
                <label className="block text-xs font-semibold text-pink-500 mb-1">
                  Lý do hủy nhiệm vụ <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={form.cancel_reason ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, cancel_reason: event.target.value }))}
                  className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                  rows={3}
                  required
                />
              </div>
            ) : null}

            {showRejectForm ? (
              <div className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2">
                <label className="block text-xs font-semibold text-red-500">
                  Lý do từ chối <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  className="w-full bg-white px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                  rows={3}
                  placeholder="Giải thích lý do từ chối cho nhân viên..."
                  disabled={saving}
                />
                <p className="text-xs text-red-500">Lý do này sẽ được gửi cho nhân viên.</p>
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="sm:w-auto w-full px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-60"
                disabled={saving}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showRejectForm) {
                    setShowRejectForm(false);
                    setRejectionReason("");
                  } else {
                    setShowRejectForm(true);
                  }
                }}
                className="sm:w-auto w-full px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-60"
                disabled={saving}
              >
                {showRejectForm ? "Đóng lý do từ chối" : "Từ chối phê duyệt"}
              </button>
              {showRejectForm ? (
                <button
                  type="button"
                  onClick={handleReject}
                  className="sm:w-auto w-full px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-60"
                  disabled={saving}
                >
                  {pendingActionType === "reject" ? "Đang từ chối..." : "Xác nhận từ chối"}
                </button>
              ) : null}
              <button
                type="submit"
                className="sm:w-auto w-full px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition disabled:opacity-60"
                disabled={saving}
              >
                {pendingActionType === "approve" ? "Đang phê duyệt..." : "Phê duyệt nhiệm vụ"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
