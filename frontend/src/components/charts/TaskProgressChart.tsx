import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

interface Task {
  task_id: number;
  title: string;
  total: number;
  date?: string;
}

interface TaskStats {
  range: { start_date: string; end_date: string };
  most: Task[];
  least: Task[];
}

interface Props {
  data: TaskStats;
  typeFilter?: "most" | "least" | "all";
}

// Biểu đồ tiến độ nhiệm vụ theo ngày
export default function TaskProgressChart({ data, typeFilter = "all" }: Props) {
  const series = useMemo(() => {
    if (!data) return [];

    const start = new Date(data.range.start_date);
    const end = new Date(data.range.end_date);

    // Chọn task theo filter
    let tasks: Task[] = [];
    if (typeFilter === "most") tasks = data.most;
    else if (typeFilter === "least") tasks = data.least;
    else tasks = [...data.most, ...data.least];

    // Tạo map ngày → tổng task
    const totalsMap: Record<string, number> = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      totalsMap[dateStr] = 0;
    }

    // Tính tổng tất cả tasks (vì không có data ngày)
    const totalTasks = tasks.reduce((sum, t) => sum + t.total, 0);
    Object.keys(totalsMap).forEach(date => {
      totalsMap[date] = totalTasks;
    });

    // Chuyển thành array cho chart, sắp xếp theo ngày
    const seriesData = Object.entries(totalsMap)
      .map(([date, current]) => ({
        date,
        current,
        previous: 0 // nếu có dữ liệu tháng trước, có thể gán ở đây
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return seriesData;
  }, [data, typeFilter]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={series}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="current"
          stroke="#4f46e5"
          name="Tổng nhiệm vụ"
          strokeWidth={3}
        />
        <Line
          type="monotone"
          dataKey="previous"
          stroke="#94a3b8"
          name="Nhiệm vụ tháng trước"
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
