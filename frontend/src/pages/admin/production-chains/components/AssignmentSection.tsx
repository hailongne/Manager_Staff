import type { ChainAssignment } from "../types";
import { formatDateTime, formatWeekLabel } from "../utils";

const humanizeCount = (count: number) => count.toLocaleString("vi-VN");

interface AssignmentSectionProps {
  chainAssignments: ChainAssignment[];
  assignmentsLoading: boolean;
  canSubmitAssignmentFeedback: boolean;
  onOpenFeedbackModal: (assignment: ChainAssignment) => void;
}

export function AssignmentSection({
  chainAssignments,
  assignmentsLoading,
  canSubmitAssignmentFeedback,
  onOpenFeedbackModal
}: AssignmentSectionProps) {
  const hasAssignments = chainAssignments.length > 0;

  return (
    <div className="mt-4 rounded-2xl border border-pink-100 bg-pink-50 p-4">
      <h4 className="text-sm font-semibold text-pink-700">Nhiệm vụ đã giao</h4>

      {assignmentsLoading && !hasAssignments ? (
        <p className="mt-3 text-xs text-pink-600">Đang tải nhiệm vụ...</p>
      ) : null}

      {hasAssignments ? (
        <ul className="mt-3 space-y-3">
          {chainAssignments.map((assignment) => (
            <li
              key={assignment.id}
              className="rounded-lg border border-pink-200 bg-white px-3 py-3 text-xs text-gray-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-gray-800">{assignment.title}</p>
                <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-600">
                  Khối lượng: {humanizeCount(assignment.quantity)} {assignment.unitLabel}
                </span>
              </div>

              {assignment.topic ? (
                <p className="mt-2 text-xs text-pink-700">Chủ đề: {assignment.topic}</p>
              ) : null}

              {assignment.description ? (
                <p className="mt-2 text-xs text-gray-600">{assignment.description}</p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                <span>Giao bởi: {assignment.creatorName || "Admin"}</span>
                <span>Ngày giao: {formatDateTime(assignment.createdAt)}</span>
                {assignment.weekIndex ? (
                  <span>Tuần thực hiện: {formatWeekLabel(assignment.weekIndex)}</span>
                ) : null}
                {assignment.dueDate ? (
                  <span>Hạn hoàn thành: {formatDateTime(assignment.dueDate)}</span>
                ) : null}
                <span>
                  Trạng thái: {assignment.status === "assigned" ? "Đang chờ" : assignment.status}
                </span>
              </div>

              {assignment.feedbacks.length ? (
                <div className="mt-3 rounded-lg border border-pink-100 bg-pink-50 px-3 py-2 text-[11px] text-pink-700">
                  <p className="font-semibold text-pink-700">Phản hồi mới nhất:</p>
                  <ul className="mt-2 space-y-2">
                    {assignment.feedbacks.map((feedback) => (
                      <li key={feedback.id} className="rounded border border-pink-100 bg-white px-2 py-2">
                        <p className="text-[11px] text-gray-700">{feedback.message}</p>
                        <p className="mt-1 text-[10px] text-gray-500">
                          {feedback.authorName || "Trưởng nhóm"} · {formatDateTime(feedback.createdAt)} · Trạng thái:{" "}
                          {feedback.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {canSubmitAssignmentFeedback ? (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenFeedbackModal(assignment)}
                    className="rounded-lg border border-pink-200 px-3 py-1 text-[11px] font-semibold text-pink-600 hover:border-pink-300 hover:text-pink-700"
                  >
                    Gửi phản hồi
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-pink-700">Chưa có nhiệm vụ nào được giao.</p>
      )}
    </div>
  );
}