import type { TaskTableProps } from "../types";
import { getWeekRange, formatTaskDate, getStatusLabel, getStatusBadgeClass } from "../utils";

export function TaskTable({
  tasks,
  userMap,
  selectedWeekOffset,
  onShowDetails
}: TaskTableProps) {
  const filteredByWeek = tasks.filter((task) => {
    if (!task.date) return true;
    if (selectedWeekOffset === 999) return true;
    const dateString = String(task.date);
    const taskDate = dateString.split("T")[0];
    const weekRange = getWeekRange(selectedWeekOffset);
    return taskDate >= weekRange.start && taskDate <= weekRange.end;
  });

  return (
    <div className="bg-white rounded-xl shadow-md border">
      <table className="w-full">
        <thead className="bg-gray-100 rounded-xl border-b">
          <tr>
            <th className="px-4 py-3 text-center text-sm font-semibold rounded-xl">Tiêu đề</th>
            <th className="px-4 py-3 text-center text-sm font-semibold">Nhân viên</th>
            <th className="px-4 py-3 text-center text-sm font-semibold">Trạng thái</th>
            <th className="px-4 py-3 text-center text-sm font-semibold">Ngày tháng</th>
            <th className="px-4 py-3 text-center text-sm font-semibold rounded-xl">Link kết quả</th>
          </tr>
        </thead>
        <tbody>
          {filteredByWeek.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                Chưa có nhiệm vụ
              </td>
            </tr>
          ) : (
            filteredByWeek.map((task) => {
              const owner = userMap.get(String(task.user_id));
              const ownerName = owner?.name || `#${task.user_id}`;
              const resultLink = task.result_link?.trim();

              return (
                <tr
                  key={task.task_id}
                  className={`border-b hover:bg-gray-50 cursor-pointer ${
                    task.status === "cancelled" ? "opacity-50 bg-gray-100" : ""
                  }`}
                  onClick={() => onShowDetails(task)}
                >
                  <td className="px-4 py-3 text-sm text-center">{task.title}</td>
                  <td className="px-4 py-3 text-sm text-center">{ownerName}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(task.status)}`}
                    >
                      {getStatusLabel(task.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="inline-block px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {task.date ? formatTaskDate(task.date) : "Không rõ"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {resultLink ? (
                      <a
                        href={resultLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 underline decoration-pink-400 font-medium"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Link
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">Không có</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
