import { useState, useEffect } from "react";
import CompletionCircle from "../../../components/ui/CompletionCircle";
import TaskProgressChart from "../../../components/charts/TaskProgressChart";
import MonthlyPerformanceBar from "../../../components/ui/charts/MonthlyPerformanceBar";
import Top5Bar from "../../../components/charts/Top5Bar";
import { useAuth } from "../../../hooks/useAuth";
import { getUsers } from "../../../api/users";
import type { User as ApiUser } from "../../../api/users";

const filterNonAdminUsers = (items: ApiUser[]) =>
  items.filter((item) => item.role !== "admin");



interface DashboardData {
  total: number;
  completed: number;
  rate: number;
  chartData: { date: string; completed?: number; total?: number; rate?: number; prevRate?: number }[];
  topMost: { name: string; value: number }[];
  topLeast: { name: string; value: number }[];
  monthlyData: { month: string; value: number }[];
  calendarData: { date: string; value: number }[];
  totalEmployees?: number;
  taskStats?: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  range: { start_date: string; end_date: string };
  most: { task_id: number; title: string; total: number; date?: string }[];
  least: { task_id: number; title: string; total: number; date?: string }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  // Trạng thái ngày tháng năm tùy chỉnh
  const [customDate, setCustomDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return { start: today, end: today };
  });
  const period = "range";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Danh sách người dùng và người dùng đã chọn (cho admin)
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("all");

  // Dữ liệu dashboard
  const [data, setData] = useState<DashboardData>({
    total: 0,
    completed: 0,
    rate: 0,
    chartData: [],
    topMost: [],
    topLeast: [],
    monthlyData: [],
    calendarData: [],
    range: { start_date: '', end_date: '' },
    most: [],
    least: [],
  });

  useEffect(() => {
    if (user?.role === "admin") {
      getUsers()
        .then((data) => {
          const filtered = filterNonAdminUsers(data);
          setUsers(filtered);
          setSelectedUser((prev) =>
            prev === "all" || filtered.some((item) => String(item.user_id) === prev) ? prev : "all"
          );
        })
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    setError(null);
  }, [period]);

  useEffect(() => {
    if (period === "range" && (!customDate.start || !customDate.end)) {
      setData({
        total: 0,
        completed: 0,
        rate: 0,
        chartData: [],
        topMost: [],
        topLeast: [],
        monthlyData: [],
        calendarData: [],
        range: { start_date: '', end_date: '' },
        most: [],
        least: [],
      });
      setError(null);
      setLoading(false);
    }
  }, [period, customDate.start, customDate.end]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      if (period !== "range") return;
      if (!customDate.start || !customDate.end) return;

      setLoading(true);
      setError(null);

      try {
        // Habit stats removed - set default values
        setData({
          total: 0,
          completed: 0,
          rate: 0,
          chartData: [],
          topMost: [],
          topLeast: [],
          monthlyData: [],
          calendarData: [],
          totalEmployees: 0,
          taskStats: undefined,
          range: { start_date: customDate.start, end_date: customDate.end },
          most: [],
          least: [],
        });
      } catch (err) {
        console.error(err);
        setError("Không thể tải dữ liệu dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customDate.start, customDate.end, user, selectedUser]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      if (period === "range") return;

      setLoading(true);
      setError(null);

      try {
        // Habit stats removed - set default values
        setData({
          total: 0,
          completed: 0,
          rate: 0,
          chartData: [],
          topMost: [],
          topLeast: [],
          monthlyData: [],
          calendarData: [],
          totalEmployees: 0,
          taskStats: undefined,
          range: { start_date: '', end_date: '' },
          most: [],
          least: [],
        });
      } catch (err) {
        console.error(err);
        setError("Không thể tải dữ liệu dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, user, selectedUser]);

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white min-h-full w-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Lỗi tải dữ liệu</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
      <div className="px-6 min-h-full">
        {/* Tiêu đề */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-pink-600">BẢNG THỐNG KÊ HIỆU SUẤT CÔNG VIỆC</h1>
          <span className="text-sm text-gray-500">
            {new Date(customDate.end).toLocaleDateString('vi-VN')}
          </span>
      </div>

      {/* Bộ lọc ngày tháng */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <label className="text-sm font-medium text-gray-700">Chọn khoảng thời gian:</label>
        <input
          type="date"
          className="px-3 py-2 border border-gray-300 rounded-lg"
          value={customDate.start}
          onChange={(e) =>
            setCustomDate((prev) => ({ ...prev, start: e.target.value }))
          }
        />
        <span className="text-gray-500">đến</span>
        <input
          type="date"
          className="px-3 py-2 border border-gray-300 rounded-lg"
          value={customDate.end}
          onChange={(e) =>
            setCustomDate((prev) => ({ ...prev, end: e.target.value }))
          }
        />

        {user?.role === "admin" && (
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="ms-select min-w-[200px]"
          >
            <option value="all">Tất cả nhân viên</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Thẻ KPI tổng hợp */}
      <div className="mb-10">
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          {/* Các thẻ chỉ số */}
          {[
            ...(user?.role === "admin"
              ? [{ key: "totalEmployees", label: "Tổng nhân viên", icon: "👥", value: data.totalEmployees }]
              : []),
            { key: "total", label: "Tổng Nhiệm Vụ", icon: "📋", value: data.taskStats?.total },
            { key: "in_progress", label: "Nhiệm Vụ Đang Làm", icon: "⏳", value: data.taskStats?.in_progress },
            { key: "completed", label: "Hoàn thành", icon: "✅", value: data.taskStats?.completed },
            { key: "cancelled", label: "Đã hủy", icon: "❌", value: data.taskStats?.cancelled },
          ].map((kpi) => (
            <div
              key={kpi.key}
              className="bg-pink-50 rounded-xl p-4 flex flex-col items-center justify-center shadow hover:shadow-lg transition"
            >
              <div className="text-2xl">{kpi.icon}</div>
              <div className="mt-2 font-medium text-pink-600 text-sm">{kpi.label}</div>
              <div className="mt-1 font-bold text-xl">{kpi.value ?? 0}</div>
            </div>
          ))}

          {/* Tỉ lệ hoàn thành riêng */}
          <div className="bg-pink-50 rounded-xl p-4 flex flex-col items-center justify-center shadow hover:shadow-lg transition">
            <div className="text-2xl">🎯</div>
            <div className="mt-2 font-medium text-pink-600 text-sm">Tỉ lệ hoàn thành</div>
            <div className="mt-1">
              <CompletionCircle progress={Math.round(data.rate)} />
            </div>
          </div>
        </div>
      </div>

      {/* Biểu đồ */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white p-4 rounded-xl shadow">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Biểu đồ đo lường mức độ hoàn thành công việc</h3>
          <TaskProgressChart data={{ range: data.range, most: data.most, least: data.least }} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Biểu đồ hiệu suất nhiệm vụ chính</h3>
          <MonthlyPerformanceBar data={{ range: data.range, most: data.most, least: data.least }} />
        </div>
      </div>

      {/* Top 5 nhiệm vụ */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow">
            <h4 className="text-sm font-semibold mb-2">TOP 5 nhiệm vụ nhiều nhất</h4>
            <Top5Bar data={data.topMost} xKey="name" yKey="value" label="Số lượng" />
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <h4 className="text-sm font-semibold mb-2">TOP 5 nhiệm vụ ít nhất</h4>
            <Top5Bar data={data.topLeast} xKey="name" yKey="value" label="Số lượng" />
          </div>
        </div>
      </div>
    </div>
    
  );
}
