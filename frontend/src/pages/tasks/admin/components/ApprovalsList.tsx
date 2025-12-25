import type { ApprovalsListProps } from "../types";
import { getPendingActionLabel, CHANGE_LABELS } from "../utils";

export function ApprovalsList({
  tasks,
  userMap,
  isApprovingAll,
  onApproveAll,
  onOpenApproval
}: ApprovalsListProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white border border-dashed border-pink-200 rounded-xl p-6 text-center text-sm text-pink-500">
        Hiện chưa có nhiệm vụ nào cần phê duyệt.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onApproveAll}
          disabled={isApprovingAll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:bg-gray-400 text-sm font-medium"
        >
          {isApprovingAll ? "Đang phê duyệt..." : `Phê duyệt tất cả (${tasks.length})`}
        </button>
      </div>
      {tasks.map((task) => {
        const owner = userMap.get(String(task.user_id));
        const ownerName = owner?.name || `#${task.user_id}`;
        const actionLabel = getPendingActionLabel(task.pending_action ?? undefined);
        const pendingChanges = (task.pending_changes ?? {}) as Record<string, unknown>;
        const changeItems = Object.entries(pendingChanges).filter(
          ([key]) => key !== "previous_status"
        );

        return (
          <div
            key={task.task_id}
            className="bg-white border border-pink-100 rounded-xl shadow-sm p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-gray-800">{task.title}</h3>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 bg-pink-100 px-2 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-pink-500" />
                    {actionLabel}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Người đề xuất: {ownerName}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenApproval(task)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-pink-300 text-pink-600 hover:bg-pink-50 text-sm"
              >
                Xem &amp; phê duyệt
              </button>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <p>
                <span className="font-medium text-pink-600">Lý do nhân viên:</span>{" "}
                {task.pending_reason || "Không cung cấp"}
              </p>
              {changeItems.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-gray-500">
                  {changeItems.map(([key, value]) => (
                    <li key={key}>
                      <span className="font-medium text-pink-500">
                        {CHANGE_LABELS[key] ?? key}:
                      </span>{" "}
                      {String(value)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
