import { useState, useEffect, useMemo, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { getTasksFiltered, createTask, updateTask, type Task, type TaskUpdatePayload } from "../../../api/tasks";
import { useAuth } from "../../../hooks/useAuth";
import { useModalToast } from "../../../hooks/useToast";
import { TaskDetailsModal } from "../shared/TaskDetailsModal";
import { getWeekDates, getWeekRange, getWeekLabel, sortTasks } from "../shared/utils";

const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
const colors = ["#4dabf7", "#4ade80", "#e879f9", "#3b82f6", "#d97706"];

type NewTaskFormState = Record<string, { title: string; description: string }>;

type ContextMenuProps = {
  task: Task;
  onCancel: (id: number) => void;
  onShowDetails: (task: Task) => void;
  onClose: () => void;
  canCancel?: boolean;
};

type TaskRowProps = {
  task: Task;
  onUpdate: (id: number, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: number) => void;
  onShowDetails: (task: Task) => void;
};

type CancelTaskModalProps = {
  task: Task;
  onSave: (updates: Partial<Task>) => Promise<void>;
  onClose: () => void;
};

function ProgressCircle({ percent, color }: { percent: number; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width="100" height="100" className="mx-auto mb-3">
      <circle cx="50" cy="50" r={radius} stroke="#e5e7eb" strokeWidth="10" fill="transparent" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        stroke={color}
        strokeWidth="10"
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" className="text-xl font-bold" fill={color}>
        {percent}%
      </text>
    </svg>
  );
}

function ContextMenu({ task, onCancel, onShowDetails, onClose, canCancel = true }: ContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      setMenuPosition({ x: event.clientX, y: event.clientY });
      setShowMenu(true);
    };

    const handleClick = () => {
      setShowMenu(false);
      onClose();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  if (!showMenu) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-40" style={{ left: menuPosition.x, top: menuPosition.y }}>
        <button
          onClick={() => {
            onShowDetails(task);
            onClose();
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
        >
          📋 Chi tiết
        </button>
        {canCancel ? (
          <button
            onClick={() => {
              onCancel(task.task_id);
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600"
          >
            ❌ Hủy
          </button>
        ) : null}
      </div>
    </>
  );
}

function TaskRow({ task, onUpdate, onDelete, onShowDetails }: TaskRowProps) {
  const displayTitle = task.title;
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isPending = task.status === "pending";
  const isCancelled = task.status === "cancelled";
  const isCompleted = task.status === "completed";

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setShowContextMenu(true);
  };

  const truncatedTitle = displayTitle.length > 40 ? `${displayTitle.substring(0, 37)}...` : displayTitle;

  const handleCheckboxToggle = () => {
    if (isCancelled || isPending || isCompleted) return;
    setShowConfirmModal(true);
  };

  const handleConfirmComplete = async () => {
    await onUpdate(task.task_id, { status: "completed" });
    setShowConfirmModal(false);
  };

  return (
    <div>
      <div
        className={`flex items-center justify-between gap-2 p-2 border-b hover:bg-gray-50 cursor-pointer ${isCancelled ? "opacity-50 bg-gray-100" : ""}`}
        onContextMenu={handleContextMenu}
      >
        <span
          className={`text-sm flex-1 ${
            task.status === "completed" ? "line-through text-gray-500" : isCancelled ? "line-through text-gray-400" : ""
          }`}
          title={truncatedTitle.length === 40 ? displayTitle : undefined}
        >
          {truncatedTitle}
          {isPending ? (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-pink-600">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />Chờ duyệt
            </span>
          ) : null}
        </span>
        <input type="checkbox" checked={task.status === "completed"} onChange={handleCheckboxToggle} className="w-3 h-3 flex-shrink-0" disabled={isCancelled || isPending || isCompleted} />
      </div>

      {showContextMenu ? (
        <ContextMenu
          task={task}
          onCancel={onDelete}
          onShowDetails={onShowDetails}
          onClose={() => setShowContextMenu(false)}
          canCancel={!isPending}
        />
      ) : null}

      {showConfirmModal ? (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowConfirmModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-pink-100 w-full max-w-sm">
            <div className="px-6 py-4 border-b border-pink-100 bg-gradient-to-r from-pink-50 via-white to-pink-50 rounded-xl">
              <h2 className="text-lg font-semibold text-pink-600">Xác nhận hoàn thành</h2>
              <p className="text-xs text-gray-500 mt-1">Vui lòng xác nhận để hoàn thành nhiệm vụ</p>
            </div>
            <div className="px-6 py-5">
              <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold text-pink-600 mb-2">Nhiệm vụ</h3>
                <p className="text-sm text-gray-700">{task.title}</p>
              </div>
              <p className="text-sm text-gray-600 text-center">Bạn có chắc chắn muốn đánh dấu nhiệm vụ này là hoàn thành?</p>
            </div>
            <div className="px-6 py-4 border-t border-pink-100 bg-gray-50 rounded-b-2xl flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-pink-200 rounded-lg text-pink-600 hover:bg-pink-50 transition font-medium text-sm"
              >
                Hủy
              </button>
              <button onClick={handleConfirmComplete} className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition font-medium text-sm">
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CancelTaskModal({ task, onSave, onClose }: CancelTaskModalProps) {
  const [reason, setReason] = useState("");
  const toast = useModalToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.showErrorToast("Vui lòng nhập lý do hủy nhiệm vụ");
      return;
    }

    await onSave({ cancel_reason: trimmedReason });
    setReason("");
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-pink-100 w-full max-w-md">
        <div className="px-6 py-4 border-b border-pink-100 bg-pink-50 rounded-t-2xl">
          <h2 className="text-xl font-semibold text-pink-600">Hủy nhiệm vụ</h2>
          <p className="text-xs text-gray-500 mt-1">Giải thích vì sao bạn cần hủy nhiệm vụ này</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">

            <div>
              <label className="block text-sm font-medium text-pink-500 mb-2">Tiêu đề</label>
              <p className="text-sm text-gray-700">{task.title}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-pink-500 mb-2">Lý do hủy *</label>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                className="w-full border border-pink-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                placeholder="Mô tả chi tiết lý do hủy nhiệm vụ"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-pink-100 bg-gray-50 rounded-b-2xl flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition text-sm">
              Đóng
            </button>
            <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm">
              Gửi phê duyệt hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingTask, setCancelingTask] = useState<Task | null>(null);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);
  const [newTaskForms, setNewTaskForms] = useState<NewTaskFormState>({
    "Thứ 2": { title: "", description: "" },
    "Thứ 3": { title: "", description: "" },
    "Thứ 4": { title: "", description: "" },
    "Thứ 5": { title: "", description: "" },
    "Thứ 6": { title: "", description: "" }
  });

  const weekDates = useMemo(() => getWeekDates(selectedWeekOffset), [selectedWeekOffset]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const range = getWeekRange(selectedWeekOffset);
      const response = await getTasksFiltered({ startDate: range.start, endDate: range.end, limit: 100 });
      setTasks(sortTasks(response.items));
    } finally {
      setLoading(false);
    }
  }, [selectedWeekOffset, user]);

  useEffect(() => {
    fetchTasks().catch(console.error);
  }, [fetchTasks]);

  const addTask = useCallback(
    async (dayTitle: string, dayIndex: number) => {
      const form = newTaskForms[dayTitle] ?? { title: "", description: "" };
      const trimmedTitle = form.title.trim();
      if (!trimmedTitle) return;

      const taskDate = weekDates[dayIndex];
      const year = taskDate.getFullYear();
      const month = String(taskDate.getMonth() + 1).padStart(2, "0");
      const day = String(taskDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const payload: Partial<Task> = { title: trimmedTitle, date: dateStr };
      if (form.description.trim()) payload.description = form.description.trim();

      const newTask = await createTask(payload);
      setTasks((prev) => sortTasks([newTask, ...prev]));
      setNewTaskForms((prev) => ({
        ...prev,
        [dayTitle]: { title: "", description: "" }
      }));
    },
    [newTaskForms, weekDates]
  );

  const updateTaskStatus = useCallback(async (id: number, updates: Partial<Task>) => {
    const updated = await updateTask(id.toString(), updates);
    setTasks((prev) => sortTasks(prev.map((task) => (task.task_id === id ? updated : task))));
  }, []);

  const removeTask = useCallback((id: number) => {
    const task = tasks.find((item) => item.task_id === id);
    if (task) {
      setCancelingTask(task);
      setShowCancelModal(true);
    }
  }, [tasks]);

  const handleCancelTask = useCallback(
    async (updates: Partial<Task>) => {
      if (!cancelingTask) return;
      const payload: TaskUpdatePayload = {
        ...updates,
        approval_reason: updates.cancel_reason
      };
      const updated = await updateTask(cancelingTask.task_id.toString(), payload);
      setTasks((prev) => sortTasks(prev.map((task) => (task.task_id === cancelingTask.task_id ? updated : task))));
      setShowCancelModal(false);
      setCancelingTask(null);
    },
    [cancelingTask]
  );

  const showTaskDetails = useCallback((task: Task) => {
    setDetailsTask(task);
    setShowDetailsModal(true);
  }, []);

  if (!user) return null;
  if (user.role === "admin") return null;
  if (loading) return <div className="p-10 text-center">Đang tải...</div>;

  return (
    <div className="p-4">
      <div className="pl-5">
        <h1 className="text-xl font-bold text-pink-600">Nhiệm vụ hằng ngày</h1>
        <p className="text-sm text-gray-500">Tổng hợp các nhiệm vụ hằng ngày và ghi nhận vào thống kê.</p>
      </div>

      <div className="p-2">
        <select value={selectedWeekOffset} onChange={(event) => setSelectedWeekOffset(Number(event.target.value))} className="ms-select min-w-[210px]">
          {[1, 0, -1, -2, -3, -4].map((offset) => (
            <option key={offset} value={offset}>
              {offset === 1 ? "Tuần tới" : getWeekLabel(offset)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {days.map((day, index) => {
          const targetDate = weekDates[index];
          const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
          const dayTasks = tasks.filter((task) => {
            if (!task.date) return false;
            const dateString = String(task.date);
            const taskDate = dateString.split("T")[0];
            return taskDate === targetDateStr;
          });
          const validDayTasks = dayTasks.filter((task) => task.status !== "cancelled" && task.status !== "pending");
          const completed = validDayTasks.filter((task) => task.status === "completed").length;
          const percent = validDayTasks.length ? Math.round((completed / validDayTasks.length) * 100) : 0;

          return (
            <div key={day} className="bg-white p-4 rounded-xl shadow-md border">
              <h2 className="font-bold text-center mb-1 text-lg">{day}</h2>
              <p className="text-sm text-gray-600 text-center mb-2">
                {weekDates[index].toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                })}
              </p>
              <ProgressCircle percent={percent} color={colors[index]} />

              <div className="mt-3 border-t pt-3 h-75 overflow-y-auto">
                {dayTasks.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-8">Chưa có nhiệm vụ</div>
                ) : (
                  dayTasks.map((task) => (
                    <TaskRow key={task.task_id} task={task} onUpdate={updateTaskStatus} onDelete={removeTask} onShowDetails={showTaskDetails} />
                  ))
                )}
              </div>

              <div className="space-y-2">
                <input
                  placeholder="Tiêu đề nhiệm vụ"
                  value={newTaskForms[day]?.title ?? ""}
                  onChange={(event) =>
                    setNewTaskForms((prev) => ({
                      ...prev,
                      [day]: {
                        title: event.target.value,
                        description: prev[day]?.description ?? ""
                      }
                    }))
                  }
                  className="border p-2 w-full rounded"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTask(day, index).catch(console.error);
                    }
                  }}
                />
                <textarea
                  placeholder="Mô tả nhiệm vụ"
                  value={newTaskForms[day]?.description ?? ""}
                  onChange={(event) =>
                    setNewTaskForms((prev) => ({
                      ...prev,
                      [day]: {
                        title: prev[day]?.title ?? "",
                        description: event.target.value
                      }
                    }))
                  }
                  className="border p-2 w-full rounded resize-none"
                  rows={2}
                />
              </div>
              <button
                onClick={() => addTask(day, index).catch(console.error)}
                className="w-full bg-pink-500 text-white text-sm mt-2 py-1.5 rounded-lg hover:bg-pink-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!newTaskForms[day]?.title?.trim()}
              >
                Gửi phê duyệt
              </button>
            </div>
          );
        })}
      </div>

      {showDetailsModal && detailsTask ? (
        <TaskDetailsModal
          task={detailsTask}
          onSave={async (updates: TaskUpdatePayload) => {
            const updated = await updateTask(detailsTask.task_id.toString(), updates);
            setTasks((prev) => sortTasks(prev.map((item) => (item.task_id === detailsTask.task_id ? updated : item))));
            setShowDetailsModal(false);
            setDetailsTask(null);
          }}
          onClose={() => {
            setShowDetailsModal(false);
            setDetailsTask(null);
          }}
          users={[]}
          currentUserRole={user.role}
        />
      ) : null}

      {showCancelModal && cancelingTask ? (
        <CancelTaskModal
          task={cancelingTask}
          onSave={async (updates) => {
            await handleCancelTask(updates);
          }}
          onClose={() => {
            setShowCancelModal(false);
            setCancelingTask(null);
          }}
        />
      ) : null}
    </div>
  );
}
