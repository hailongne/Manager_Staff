import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
// link not needed here (password form is inline)
import { useAuth } from "../../../hooks/useAuth";
import { useModalToast } from "../../../hooks/useToast";
import { changePassword, type ChangePasswordPayload } from "../../../api/users";
import { uploadAvatar, uploadCv } from "../../../api/users";
import { FlashMessage } from "../../../components/ui/FlashMessage";
import {
  submitProfileUpdate,
  getMyProfileUpdates,
  type ProfileUpdateRequest,
  type SubmitProfileUpdatePayload
} from "../../../api/profileUpdates";

// Kiểu dữ liệu form hồ sơ
interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  work_shift_start: string;
  work_shift_end: string;
  note: string;
  reason: string;
}

// Form mặc định
const DEFAULT_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  work_shift_start: "08:30",
  work_shift_end: "17:30",
  note: ""
  ,reason: ""
};

// Nhãn trạng thái cập nhật
const STATUS_LABELS: Record<ProfileUpdateRequest["status"], { text: string; tone: string }> = {
  pending: { text: "Đang chờ", tone: "bg-amber-50 text-amber-600" },
  approved: { text: "Đã duyệt", tone: "bg-emerald-50 text-emerald-600" },
  rejected: { text: "Từ chối", tone: "bg-red-50 text-red-600" }
};

// Nhãn các trường
const FIELD_LABELS: Record<string, string> = {
  name: "Họ tên",
  email: "Email",
  username: "Tên đăng nhập",
  phone: "Số điện thoại",
  address: "Địa chỉ",
  department: "Phòng ban",
  department_position: "Chức vụ phòng ban",
  date_joined: "Ngày vào làm",
  employment_status: "Trạng thái làm việc",
  annual_leave_quota: "Phép năm",
  remaining_leave_days: "Ngày phép còn lại",
  work_shift_start: "Giờ vào ca",
  work_shift_end: "Giờ tan ca",
  note: "Ghi chú",
  official_confirmed_at: "Ngày bắt đầu"
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
  if ((field === "official_confirmed_at" || field === "date_joined") && typeof raw === "string") {
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

// Định dạng giá trị hồ sơ
const formatProfileValue = (field: string, raw: unknown) => {
  if (raw === null || raw === undefined || raw === "") return "Chưa cập nhật";
  if (field === "employment_status" && typeof raw === "string") {
    return EMPLOYMENT_STATUS_LABELS[raw] ?? raw;
  }
  if ((field === "official_confirmed_at" || field === "date_joined") && typeof raw === "string") {
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
  return String(raw);
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const toast = useModalToast();
  type PasswordFormState = ChangePasswordPayload;
  const DEFAULT_PW_FORM: PasswordFormState = { currentPassword: "", newPassword: "", confirmPassword: "" };
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(DEFAULT_PW_FORM);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwMessageVisible, setPwMessageVisible] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [requests, setRequests] = useState<ProfileUpdateRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const cvInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarPendingFile, setAvatarPendingFile] = useState<File | null>(null);
  const [cvPendingFile, setCvPendingFile] = useState<File | null>(null);
  const [cvUploaded, setCvUploaded] = useState<boolean>(() => Boolean((user as { cv_url?: string })?.cv_url));

  useEffect(() => {
    setCvUploaded(Boolean((user as { cv_url?: string })?.cv_url));
  }, [user]);

  const resolveAssetUrl = (u?: string | null): string | null => {
    if (!u) return null;
    const s = String(u);
    return s.startsWith("/") ? `${window.location.origin}${s}` : s;
  };

  const resolvedAvatarUrl = resolveAssetUrl((user as { avatar_url?: string })?.avatar_url ?? null);
  const resolvedCvUrl = resolveAssetUrl((user as { cv_url?: string })?.cv_url ?? null);

  const editable = useMemo<FormState>(() => ({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
    work_shift_start: user?.work_shift_start ?? "08:30",
    work_shift_end: user?.work_shift_end ?? "17:30",
    note: user?.note ?? "",
    reason: ""
  }), [user]);

  useEffect(() => {
    setForm({ ...DEFAULT_FORM, ...editable });
  }, [editable]);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingRequests(true);
      const data = await getMyProfileUpdates();
      setRequests(data);
    } catch (error) {
      console.error(error);
      toast.showErrorToast("Không thể tải lịch sử yêu cầu");
    } finally {
      setLoadingRequests(false);
    }
  }, [user, toast]);

  // Chỉ load requests khi component mount, không load lại khi user thay đổi
  useEffect(() => {
    if (!user) return;
    loadRequests().catch(console.error);
  }, [loadRequests, user]);

  // (removed debug logs)

  const handlePwChange = (field: keyof PasswordFormState) => (e: ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((p) => ({ ...p, [field]: e.target.value }));
  };

  const dismissPwMessage = () => {
    setPwMessageVisible(false);
    setPwMessage(null);
  };

  const handlePwSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPwSubmitting(true);
    if (passwordForm.newPassword.length < 6) {
      const msg = "Mật khẩu mới phải có ít nhất 6 ký tự.";
      setPwMessage({ type: "error", text: msg });
      toast.showErrorToast(msg);
      setPwSubmitting(false);
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });
      await refreshUser();
      const successMsg = "Đã đổi mật khẩu thành công.";
      setPwMessage({ type: "success", text: successMsg });
      toast.showSuccessToast(successMsg);
      setPasswordForm(DEFAULT_PW_FORM);
      setShowPasswordForm(false);
    } catch (error) {
      console.error(error);
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      const text = axiosError.response?.data?.message || axiosError.message || "Không thể đổi mật khẩu.";
      setPwMessage({ type: "error", text });
      toast.showErrorToast(text);
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.reason || form.reason.trim() === "") {
      toast.showErrorToast("Vui lòng nhập lý do thay đổi");
      return;
    }
    setSubmitting(true);
    try {
      await submitProfileUpdate(form as SubmitProfileUpdatePayload);
      toast.showSuccessToast("Yêu cầu đã được gửi");
      setForm({ ...DEFAULT_FORM, ...editable });
      loadRequests().catch(console.error);
    } catch (err) {
      console.error(err);
      toast.showErrorToast("Không thể gửi yêu cầu");
    } finally {
      setSubmitting(false);
    }
  };


  const profileSummary = useMemo(() => {
    const source = user ?? {};
      const layout: Array<{ field: keyof typeof FIELD_LABELS; span?: 1 | 2 }> = [
      { field: "name" },
      { field: "email" },
      { field: "username" },
      { field: "phone" },
      { field: "address", span: 2 },
      { field: "department" },
      { field: "department_position" },
      { field: "employment_status" },
      { field: "date_joined" },
      { field: "official_confirmed_at" },
      { field: "annual_leave_quota" },
      { field: "remaining_leave_days" },
      { field: "work_shift_start" },
      { field: "work_shift_end" },
      { field: "note", span: 2 }
    ];

    return layout.map(({ field, span }) => ({
      field,
      span: span ?? 1,
      label: FIELD_LABELS[field] ?? field,
      value: formatProfileValue(field, (source as Record<string, unknown>)[field])
    }));
  }, [user]);

  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Bạn cần đăng nhập để xem trang này.
        </div>
      </div>
    );
  }

  return (
    <div className=" mx-auto px-6 pb-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-orange-600">Hồ sơ của tôi</h1>
        <p className="text-sm text-gray-500">Cập nhật thông tin cá nhân và theo dõi trạng thái phê duyệt.</p>
      </header>

      <aside className="md:col-span-1 flex items-start">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
              {avatarPreviewUrl ? (
                <img src={avatarPreviewUrl} alt="avatar-preview" className="w-full h-full object-cover" />
              ) : resolvedAvatarUrl ? (
                <img src={resolvedAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-400 text-4xl">👤</div>
              )}
            </div>

            {/* small overlapping edit icon */}
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute right-0 bottom-0 -translate-x-1/4 translate-y-1/4 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs border border-orange-600 shadow-sm transition-colors duration-200 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              title="Cập nhật ảnh đại diện"
            >
              ✎
            </button>

            {avatarPendingFile ? (
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 flex items-center gap-2 p-1">
                <button
                  onClick={async () => {
                    if (!avatarPendingFile || !user) return;
                    try {
                      await uploadAvatar(user.user_id, avatarPendingFile);
                      await refreshUser();
                    } catch (err) {
                      console.error(err);
                    } finally {
                      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
                      setAvatarPreviewUrl(null);
                      setAvatarPendingFile(null);
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm shadow-md transition"
                  title="Cập nhật ảnh"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
                    setAvatarPreviewUrl(null);
                    setAvatarPendingFile(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 border border-slate-600 text-slate-200 text-sm shadow-md transition"
                  title="Hủy"
                >
                  ✕
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800">{user.name}</h3>
            <p className="text-sm text-gray-500">{(user as { department?: string })?.department ?? ""}</p>

            <div className="mt-3 flex items-center gap-2">
              {(resolvedCvUrl || cvUploaded) ? (
                <>
                  <button
                    onClick={() => window.open(resolvedCvUrl ?? ((user as { cv_url?: string })?.cv_url as string) ?? "#", "_blank")}
                    className="px-2 py-1 rounded-md bg-transparent border border-orange-500 text-orange-400 text-sm hover:bg-orange-600/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  >
                    Xem CV
                  </button>
                  <button
                    onClick={() => cvInputRef.current?.click()}
                    className="px-2 py-1 rounded-md bg-transparent border border-orange-500 text-orange-400 text-sm hover:bg-orange-600/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                    title="Cập nhật CV"
                  >
                    ✎
                  </button>
                </>
              ) : (
                <button
                  onClick={() => cvInputRef.current?.click()}
                  className="px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm hover:bg-orange-500/15 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                >
                  Tải CV
                </button>
              )}
            </div>
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f || !user) return;
              const url = URL.createObjectURL(f);
              setAvatarPreviewUrl(url);
              setAvatarPendingFile(f);
              e.currentTarget.value = "";
            }}
          />

          <input
            ref={cvInputRef}
            type="file"
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f || !user) return;
              setCvPendingFile(f);
              e.currentTarget.value = "";
            }}
          />

          {cvPendingFile ? (
            <div className="ml-4 mt-2 flex gap-2">
              <button
                onClick={async () => {
                  if (!cvPendingFile || !user) return;
                  try {
                    await uploadCv(user.user_id, cvPendingFile);
                    await refreshUser();
                    setCvUploaded(Boolean((user as { cv_url?: string })?.cv_url));
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setCvPendingFile(null);
                  }
                }}
                className="px-2 py-1 text-xs rounded-md bg-orange-600 text-white"
              >
                Cập nhật
              </button>
              <button
                onClick={() => {
                  setCvPendingFile(null);
                }}
                className="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-700 bg-white"
              >
                Hủy
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <header className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase">Thông tin hiện tại</h2>
            <p className="text-xs text-gray-500">Dữ liệu đã được quản trị phê duyệt gần nhất.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profileSummary.map(({ field, label, value, span }) => {
              const placeholder = value === "Chưa cập nhật";
              if (field === "note") {
                return (
                  <div
                    key={field}
                    className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 py-3 md:col-span-3 min-h-[96px]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-500">
                      {label}
                    </p>
                    <p className={`mt-1 text-sm whitespace-pre-line break-words ${placeholder ? "text-gray-400" : "text-gray-800"}`}>
                      {value}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={field}
                  className={`rounded-xl border border-orange-100 bg-orange-50/40 px-4 py-3 ${span === 2 ? "md:col-span-2" : ""}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-500">
                    {label}
                  </p>
                  <p className={`mt-1 text-sm whitespace-pre-line break-words ${placeholder ? "text-gray-400" : "text-gray-800"}`}>
                    {value}
                  </p>
                </div>
              );
            })}
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 px-4 py-3 md:col-span-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-500">Mật khẩu hiện tại</p>
              <p className="mt-1 text-sm text-gray-800">******** (đã mã hóa)</p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordForm((s) => !s)}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-orange-600 hover:text-orange-700"
                >
                  {showPasswordForm ? "Hủy" : "Đổi mật khẩu"}
                </button>
              </div>

              {showPasswordForm ? (
                <div className="mt-3">
                  {pwMessage ? (
                    <FlashMessage
                      type={pwMessage.type}
                      text={pwMessage.text}
                      onClose={dismissPwMessage}
                      position="toaster"
                      visible={pwMessageVisible}
                    />
                  ) : null}

                  <form onSubmit={handlePwSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu hiện tại</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={handlePwChange("currentPassword")}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                        autoComplete="current-password"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu mới</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={handlePwChange("newPassword")}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={handlePwChange("confirmPassword")}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={pwSubmitting}
                        className="px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-60 text-sm"
                      >
                        {pwSubmitting ? "Đang đổi..." : "Xác nhận"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <header className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase">Thông tin chỉnh sửa</h2>
            <p className="text-xs text-gray-500">Dữ liệu được phép sửa và gửi quản trị phê duyệt gần nhất.</p>
          </header>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Họ tên</label>
                <input
                  value={form.name}
                  onChange={handleChange("name")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Số điện thoại</label>
                <input
                  value={form.phone}
                  onChange={handleChange("phone")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Địa chỉ</label>
                <input
                  value={form.address}
                  onChange={handleChange("address")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              {/* position field removed */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Giờ vào ca</label>
                <input
                  type="time"
                  value={form.work_shift_start}
                  onChange={handleChange("work_shift_start")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Giờ tan ca</label>
                <input
                  type="time"
                  value={form.work_shift_end}
                  onChange={handleChange("work_shift_end")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Ghi chú thêm</label>
                <textarea
                value={form.note}
                onChange={handleChange("note")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Lý do thay đổi (gửi tới quản trị)</label>
              <textarea
                value={form.reason}
                onChange={handleChange("reason")}
                rows={2}
                placeholder="Lý do để quản trị phê duyệt"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-60"
              >
                {submitting ? "Đang gửi..." : "Gửi yêu cầu cập nhật"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <header className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase">Lịch sử yêu cầu cập nhật</h2>
          <p className="text-xs text-gray-500">Theo dõi tiến trình phê duyệt các thay đổi gần đây.</p>
        </header>

        {loadingRequests ? (
          <div className="text-sm text-gray-500">Đang tải lịch sử yêu cầu...</div>
        ) : requests.length === 0 ? (
          <div className="text-sm text-gray-500">Bạn chưa có yêu cầu cập nhật nào trước đó.</div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const statusMeta = STATUS_LABELS[request.status];
              const updatedAt = request.updated_at ? new Date(request.updated_at) : null;
              const createdAt = request.created_at ? new Date(request.created_at) : null;
              const changeEntries = Object.entries(request.changes ?? {});

              return (
                <div key={request.request_id} className="border border-orange-100 bg-orange-50/40 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Yêu cầu #{request.request_id}</p>
                      <p className="text-xs text-gray-500">
                        Gửi lúc {createdAt ? createdAt.toLocaleString("vi-VN") : "không xác định"}
                        {updatedAt && (!createdAt || updatedAt.getTime() !== createdAt.getTime())
                          ? ` · Cập nhật ${updatedAt.toLocaleString("vi-VN")}`
                          : ""}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusMeta.tone}`}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {statusMeta.text}
                    </span>
                  </div>

                  {changeEntries.length > 0 ? (
                    <ul className="text-sm text-gray-700 space-y-1">
                      {changeEntries.map(([key, value]) => {
                        const label = FIELD_LABELS[key] ?? key;
                        return (
                          <li key={key}>
                            <span className="font-medium text-orange-600">{label}:</span> {formatChangeValue(key, value)}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Không có thông tin thay đổi cụ thể.</p>
                  )}

                      {request.reason ? (
                        <div className="mt-2 border border-yellow-100 bg-yellow-50 rounded-lg p-3 text-sm text-yellow-700">
                          <p className="font-medium">Lý do thay đổi:</p>
                          <p className="whitespace-pre-line mt-1">{request.reason}</p>
                        </div>
                      ) : null}

                  {request.admin_note ? (
                    <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-700">
                      <p className="font-medium">Ghi chú từ quản trị:</p>
                      <p className="whitespace-pre-line mt-1">{request.admin_note}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
