import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

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

interface MonthlyPerformanceBarProps {
  data: TaskStats;
  typeFilter?: "most" | "least" | "all";
}

// Biểu đồ hiệu suất hàng tháng
export default function MonthlyPerformanceBar({ data, typeFilter = "all" }: MonthlyPerformanceBarProps) {
  // Tính toán dữ liệu theo tháng
  const monthlyData = useMemo(() => {
    if (!data) return [];

    const start = new Date(data.range.start_date);
    const end = new Date(data.range.end_date);

    // Tạo map các tháng
    const monthsMap: Record<string, number> = {};
    const d = new Date(start);
    while (d <= end) {
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      monthsMap[key] = 0;
      d.setMonth(d.getMonth() + 1);
    }

    // Chọn task theo filter
    let tasks: Task[] = [];
    if (typeFilter === "most") tasks = data.most;
    else if (typeFilter === "least") tasks = data.least;
    else tasks = [...data.most, ...data.least];

    // Tổng task theo tháng
    tasks.forEach((t) => {
      const taskDate = t.date ? new Date(t.date) : new Date(data.range.end_date);
      const key = `${taskDate.getFullYear()}-${(taskDate.getMonth() + 1).toString().padStart(2, "0")}`;
      monthsMap[key] = (monthsMap[key] || 0) + t.total;
    });

    return Object.entries(monthsMap).map(([month, value]) => ({ month, value }));
  }, [data, typeFilter]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={monthlyData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" fill="#10b981" name="Tổng nhiệm vụ" />
      </BarChart>
    </ResponsiveContainer>
  );
}
