import { useState, useEffect } from "react";
import type { Task, TaskUpdatePayload } from "../../../api/tasks";
import type { User as ApiUser } from "../../../api/users";
import { useModalToast } from "../../../hooks/useToast";

type TaskDetailsModalProps = {
  task: Task;
  onSave: (updates: TaskUpdatePayload) => void;
  onClose: () => void;
  users?: ApiUser[];
  currentUserRole?: string;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "text-orange-600 bg-orange-100";
    case "completed":
      return "text-pink-600 bg-pink-100";
    case "in_progress":
      return "text-yellow-600 bg-yellow-100";
    case "cancelled":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "Chưa có";
  return new Date(dateString).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

const formatHeaderDate = (dateString: string | undefined) => {
  if (!dateString) return "Chưa có";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

export function TaskDetailsModal({ task, onSave, onClose, users, currentUserRole }: TaskDetailsModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description || "");
  const [editedStatus, setEditedStatus] = useState(task.status as "in_progress" | "completed" | "cancelled");
  const [editedResultLink, setEditedResultLink] = useState(task.result_link || "");
  const [approvalReason, setApprovalReason] = useState("");
  const toast = useModalToast();

  const displayTitle = task.title;
  const isAdmin = currentUserRole === "admin";
  const isPending = task.status === "pending";

  const userName = users?.find((u) => u.user_id.toString() === task.user_id.toString())?.name || `User ${task.user_id}`;

  const handleSave = () => {
    const trimmedTitle = editedTitle.trim();
    const trimmedDescription = editedDescription.trim();
    const trimmedResultLink = editedResultLink.trim();

    if (!trimmedTitle) {
      toast.showErrorToast("Tiêu đề nhiệm vụ không được để trống");
      return;
    }

    if (!trimmedDescription) {
      toast.showErrorToast("Mô tả nhiệm vụ không được để trống");
      return;
    }

    if (trimmedResultLink) {
      const isValid = /^https?:\/\/.{4,}/.test(trimmedResultLink);
      if (!isValid) {
        toast.showErrorToast("Vui lòng nhập link hợp lệ (bắt đầu bằng http:// hoặc https://)");
        return;
      }
    }

    const updates: TaskUpdatePayload = {};

    if (trimmedTitle !== task.title) updates.title = trimmedTitle;
    if (trimmedDescription !== (task.description ?? "")) updates.description = trimmedDescription;
    if (trimmedResultLink !== (task.result_link ?? "")) updates.result_link = trimmedResultLink || undefined;
    if (editedStatus !== task.status) updates.status = editedStatus;

    if (!isAdmin) {
      if (Object.keys(updates).length === 0) {
        toast.showErrorToast("Không có thay đổi nào cần gửi phê duyệt");
        return;
      }
      if (!approvalReason.trim()) {
        toast.showErrorToast("Vui lòng cung cấp lý do để gửi phê duyệt");
        return;
      }
      updates.approval_reason = approvalReason.trim();
    }

    if (Object.keys(updates).length === 0) {
      toast.showErrorToast("Không có thay đổi nào được áp dụng");
      return;
    }

    onSave(updates);
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditedTitle(task.title);
    setEditedDescription(task.description || "");
    setEditedStatus(task.status as "in_progress" | "completed" | "cancelled");
    setEditedResultLink(task.result_link || "");
    setApprovalReason("");
    setEditMode(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-pink-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-pink-100 via-pink-50 to-white text-pink-500 p-6 rounded-t-xl border-b border-pink-100">
          <h2 className="text-2xl font-bold mb-2">{displayTitle}</h2>
          <div className="flex items-center justify-between text-pink-500">
            <p>👤 {userName}</p>
            <p>📅 {formatHeaderDate(task.date)}</p>
          </div>
        </div>

        <div className="p-6 space-y-10 overflow-y-auto flex-1">

          <div className="bg-pink-50 border border-pink-100 shadow-lg rounded-2xl p-4">
            <h3 className="font-semibold text-pink-500 mb-4 flex items-center gap-2">
              📝 Nội dung nhiệm vụ
              <div>
                <span className={`inline-block px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                  {task.status === "pending"
                    ? "Đang chờ"
                    : task.status === "in_progress"
                    ? "Đang làm"
                    : task.status === "completed"
                    ? "Hoàn thành"
                    : task.status === "cancelled"
                    ? "Đã hủy"
                    : task.status}
                </span>
              </div>
            </h3>
            <div className="space-y-4">
              {task.status === "cancelled" && task.cancel_reason ? (
                <div className="mt-4 pt-4 border-t border-red-100">
                  <label className="block text-sm font-medium text-red-500 mb-2">Lý do hủy:</label>
                  <p className="text-sm bg-white px-3 py-2 rounded border text-red-500 min-h-[3rem]">{task.cancel_reason}</p>
                </div>
              ) : null}
              {isPending && task.pending_reason ? (
                <div className="mt-4 pt-4 border-t border-orange-100">
                  <label className="block text-sm font-medium text-orange-600 mb-2">Lý do chờ duyệt:</label>
                  <p className="text-sm bg-white px-3 py-2 rounded border text-orange-600 min-h-[3rem]">{task.pending_reason}</p>
                </div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-pink-500 mb-2">Tiêu đề:</label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(event) => setEditedTitle(event.target.value)}
                    className="bg-white border border-pink-100 shadow-lg w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200"
                  />
                ) : (
                  <p className="font-medium text-sm bg-white px-3 py-2 rounded border">{displayTitle}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-pink-500 mb-2">Mô tả:</label>
                {editMode ? (
                  <textarea
                    value={editedDescription}
                    onChange={(event) => setEditedDescription(event.target.value)}
                    rows={3}
                    className="bg-white border border-pink-100 shadow-lg w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none"
                  />
                ) : (
                  <p className="text-sm bg-white px-3 py-2 rounded border min-h-[3rem]">{task.description || "Không có mô tả"}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-pink-500 mb-2">Link kết quả công việc:</label>
                {editMode ? (
                  <input
                    type="url"
                    value={editedResultLink}
                    onChange={(event) => setEditedResultLink(event.target.value)}
                    className="bg-white border border-pink-100 shadow-lg w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200"
                    placeholder="https://..."
                  />
                ) : task.result_link ? (
                  <a
                    href={task.result_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 underline decoration-pink-400 font-medium"
                  >
                    Kết quả công việc
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Chưa có kết quả công việc</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-pink-50 border border-pink-100 shadow-lg rounded-2xl p-4">
            <h3 className="font-semibold text-pink-500 mb-4 flex items-center gap-2">📅 Thông tin thời gian</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-medium text-pink-500 mb-1">Ngày tạo:</span>
                <p className="text-sm bg-white px-3 py-2 rounded border">{formatDate(task.created_at)}</p>
              </div>
              <div>
                <span className="block text-sm font-medium text-pink-500 mb-1">Hoàn thành:</span>
                <p className="text-sm bg-white px-3 py-2 rounded border">{formatDate(task.completed_at)}</p>
              </div>
            </div>
            <div className="mt-4">
              <span className="block text-sm font-medium text-pink-500 mb-1">Cập nhật cuối:</span>
              <p className="text-sm bg-white px-3 py-2 rounded border">{formatDate(task.updated_at)}</p>
            </div>
          </div>
        </div>

        <div className="bg-pink-50 border-t border-pink-100 px-6 py-4 rounded-b-xl space-y-3 flex-shrink-0">
          {!editMode ? (
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => {
                  setApprovalReason("");
                  setEditMode(true);
                }}
                className="px-4 py-2 bg-pink-300 text-white rounded-lg hover:bg-pink-400 transition duration-200 disabled:opacity-50"
                disabled={!isAdmin && isPending}
              >
                Chỉnh sửa
              </button>
              <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition duration-200">
                Đóng
              </button>
            </div>
          ) : (
            <>
              {!isAdmin ? (
                <div>
                  <label className="block text-xs font-semibold text-pink-500 mb-1">Lý do gửi phê duyệt *</label>
                  <textarea
                    value={approvalReason}
                    onChange={(event) => setApprovalReason(event.target.value)}
                    rows={3}
                    className="w-full bg-white px-3 py-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                    placeholder="Mô tả lý do bạn cần cập nhật nhiệm vụ này"
                  />
                </div>
              ) : null}
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <button onClick={handleSave} className="px-4 py-2 bg-pink-300 text-white rounded-lg hover:bg-pink-500 transition duration-200">
                  Lưu thay đổi
                </button>
                <button onClick={handleCancel} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition duration-200">
                  Hủy bỏ
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
