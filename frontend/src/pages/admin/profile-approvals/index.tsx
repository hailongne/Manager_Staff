import { useEffect, useMemo, useState } from "react";
import {
  getPendingProfileUpdates,
  getProfileUpdateHistory,
  reviewProfileUpdate,
  type ProfileUpdateRequest
} from "../../../api/profileUpdates";
import { useAuth } from "../../../hooks/useAuth";

// Trạng thái hành động phê duyệt
interface ActionState {
  loadingId: number | null;
  error: string | null;
}

// Kiểu dáng trạng thái
const STATUS_STYLES: Record<ProfileUpdateRequest["status"], { label: string; tone: string }> = {
  pending: { label: "Đang chờ", tone: "bg-amber-50 text-amber-600" },
  approved: { label: "Đã duyệt", tone: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "Từ chối", tone: "bg-red-50 text-red-600" }
};

// Nhãn trường
const FIELD_LABELS: Record<string, string> = {
  name: "Họ tên",
  email: "Email",
  phone: "Số điện thoại",
  address: "Địa chỉ",
  position: "Vị trí công việc",
  date_joined: "Ngày vào làm",
  employment_status: "Trạng thái làm việc",
  work_shift_start: "Giờ vào ca",
  work_shift_end: "Giờ tan ca",
  note: "Ghi chú",
  annual_leave_quota: "Phép năm",
  remaining_leave_days: "Ngày phép còn lại"
};

// Nhãn trạng thái làm việc
const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  apprentice: "Học việc",
  probation: "Thử việc",
  intern: "Thực tập",
  part_time: "Bán thời gian",
  contract: "Hợp đồng",
  official: "Chính thức",
  resigned: "Đã nghỉ"
};

// Định dạng giá trị thay đổi
const formatChangeValue = (field: string, raw: unknown) => {
  if (raw === null || raw === undefined || raw === "") return "(Xóa thông tin)";
  if (field === "employment_status" && typeof raw === "string") {
    return EMPLOYMENT_STATUS_LABELS[raw] ?? raw;
  }
  if (field === "date_joined" && typeof raw === "string") {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString("vi-VN");
  }
  if ((field === "work_shift_start" || field === "work_shift_end") && typeof raw === "string") {
    return raw.slice(0, 5);
  }
  if ((field === "annual_leave_quota" || field === "remaining_leave_days") && raw !== null && raw !== undefined) {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      return `${numeric.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ngày`;
    }
  }
  return typeof raw === "object" ? JSON.stringify(raw) : String(raw);
};

export default function ProfileApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ProfileUpdateRequest[]>([]);
  const [history, setHistory] = useState<ProfileUpdateRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actionState, setActionState] = useState<ActionState>({ loadingId: null, error: null });
  const [historyState, setHistoryState] = useState<{ error: string | null }>(
    { error: null }
  );

  const loadRequests = async () => {
    try {
      setLoadingPending(true);
      const data = await getPendingProfileUpdates();
      setRequests(data);
    } catch (error) {
      console.error(error);
      setActionState({ loadingId: null, error: "Không thể tải danh sách phê duyệt" });
    } finally {
      setLoadingPending(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await getProfileUpdateHistory();
      setHistory(data);
      setHistoryState((prev) => ({ ...prev, error: null }));
    } catch (error) {
      console.error(error);
      setHistoryState((prev) => ({ ...prev, error: "Không thể tải lịch sử phê duyệt" }));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadRequests();
    void loadHistory();
  }, []);

  const handleDecision = async (requestId: number, decision: "approved" | "rejected") => {
    const note = decision === "rejected"
      ? window.prompt("Nhập ghi chú cho nhân viên (tùy chọn)") ?? undefined
      : undefined;

    try {
      setActionState({ loadingId: requestId, error: null });
      await reviewProfileUpdate(requestId, decision, note);
      await Promise.all([loadRequests(), loadHistory()]);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể cập nhật yêu cầu";
      setActionState({ loadingId: null, error: message });
    }
  };

  const refreshCurrentTab = () => {
    if (activeTab === "pending") {
      loadRequests().catch(console.error);
    } else {
      loadHistory().catch(console.error);
    }
  };

  const summarizedHistory = useMemo(() => history, [history]);

  if (user?.role !== "admin") {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Bạn không có quyền truy cập trang này.
        </div>
      </div>
    );
  }
  return (
    <div className="py-6">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-pink-600">Phê duyệt cập nhật hồ sơ</h1>
          <p className="text-sm text-gray-500">Xác nhận thay đổi thông tin do nhân viên gửi lên.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-pink-200 bg-pink-50 text-xs font-medium text-pink-600">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1.5 rounded-full transition ${activeTab === "pending" ? "bg-white text-pink-600 shadow" : "text-pink-500"}`}
            >
              Đang chờ
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded-full transition ${activeTab === "history" ? "bg-white text-pink-600 shadow" : "text-pink-500"}`}
            >
              Lịch sử
            </button>
          </div>
          <button
            onClick={refreshCurrentTab}
            className="px-4 py-2 text-sm rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50"
          >
            Làm mới
          </button>
        </div>
      </header>

      {activeTab === "pending" && actionState.error ? (
        <div className="mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-600">
          {actionState.error}
        </div>
      ) : null}

      {activeTab === "history" && historyState.error ? (
        <div className="mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-600">
          {historyState.error}
        </div>
      ) : null}

      {activeTab === "pending" ? (
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loadingPending ? (
            <div className="p-6 text-sm text-gray-500">Đang tải danh sách yêu cầu...</div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Không có yêu cầu nào cần phê duyệt.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nhân viên</th>
                  <th className="px-4 py-3 text-left font-semibold">Thông tin đề xuất</th>
                  <th className="px-4 py-3 text-left font-semibold">Gửi lúc</th>
                  <th className="px-4 py-3 text-right font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const entries = Object.entries(request.changes ?? {});
                  return (
                    <tr key={request.request_id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <p className="font-semibold">{request.requester?.name ?? `#${request.user_id}`}</p>
                        <p className="text-xs text-gray-500">{request.requester?.email ?? "Không có email"}</p>
                        {request.requester?.position ? (
                          <p className="text-xs text-gray-500 mt-1">{request.requester.position}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 space-y-2">
                        {entries.map(([key, value]) => (
                          <div key={key} className="rounded-xl border border-pink-100 bg-pink-50/60 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-pink-500">{FIELD_LABELS[key] ?? key}</p>
                            <p className="text-sm text-gray-700 font-medium">{formatChangeValue(key, value)}</p>
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(request.created_at).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDecision(request.request_id, "approved")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
                            disabled={actionState.loadingId === request.request_id}
                          >
                            {actionState.loadingId === request.request_id ? "Đang xử lý..." : "Chấp nhận"}
                          </button>
                          <button
                            onClick={() => handleDecision(request.request_id, "rejected")}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
                            disabled={actionState.loadingId === request.request_id}
                          >
                            Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loadingHistory ? (
            <div className="p-6 text-sm text-gray-500">Đang tải lịch sử phê duyệt...</div>
          ) : summarizedHistory.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Chưa có lịch sử phê duyệt.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nhân viên</th>
                  <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-semibold">Thông tin đã xử lý</th>
                  <th className="px-4 py-3 text-left font-semibold">Phê duyệt bởi</th>
                  <th className="px-4 py-3 text-left font-semibold">Ghi chú</th>
                  <th className="px-4 py-3 text-left font-semibold">Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {summarizedHistory.map((item) => {
                  const badge = STATUS_STYLES[item.status];
                  const entries = Object.entries(item.changes ?? {});
                  return (
                    <tr key={item.request_id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <p className="font-semibold">{item.requester?.name ?? `#${item.user_id}`}</p>
                        <p className="text-xs text-gray-500">{item.requester?.email ?? "Không có email"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.tone}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 space-y-2">
                        {entries.map(([key, value]) => (
                          <div key={key} className="rounded-xl border border-pink-100 bg-pink-50/60 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-pink-500">{FIELD_LABELS[key] ?? key}</p>
                            <p className="text-sm text-gray-700 font-medium">{formatChangeValue(key, value)}</p>
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.reviewer?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {item.admin_note || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(item.updated_at).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
