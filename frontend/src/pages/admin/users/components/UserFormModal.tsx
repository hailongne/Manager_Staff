import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent } from "react";
import classNames from "classnames";
import { useModalToast } from "../../../../hooks/useToast";
import type { FormModalProps, FormState, ActiveRoleOption } from "../types";
import { EMPLOYMENT_STATUS_OPTIONS, ROLE_OPTIONS, normalizeDepartmentKey, validateUserForm } from "../utils";

export function UserFormModal({
  open,
  title,
  initialValues,
  submitting,
  onSubmit,
  onClose,
  lockRoleToAdmin = false,
  departmentOptions,
  departmentSelectionDisabled = false,
  departmentRoleSummary,
  currentUserId = null
}: FormModalProps) {
  const [values, setValues] = useState<FormState>(initialValues);
  const toast = useModalToast();

  const effectiveDepartmentOptions = useMemo(() => {
    if (!values.department) return departmentOptions;
    const currentKey = normalizeDepartmentKey(values.department);
    const hasOption = departmentOptions.some(
      (option) => normalizeDepartmentKey(option.name) === currentKey
    );
    if (hasOption) return departmentOptions;
    return [...departmentOptions, { department_id: -1, name: values.department }];
  }, [departmentOptions, values.department]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setValues(initialValues);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialValues, open]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, submitting, onClose]);

  const activeRoleOptions: ActiveRoleOption[] = useMemo(() => {
    if (!values.department) return [];
    const departmentKey = normalizeDepartmentKey(values.department);
    if (!departmentKey) return [];
    const summary = departmentRoleSummary[departmentKey];
    if (!summary || summary.length === 0) return [];
    const currentRoleKey = values.department_position
      ? normalizeDepartmentKey(values.department_position)
      : "";
    const currentUserNumericId = typeof currentUserId === "number" ? currentUserId : null;

    return summary.map((item) => {
      const occupantIds = Array.from(
        new Set(item.occupantIds.filter((id) => typeof id === "number" && Number.isFinite(id)))
      );
      const adjustedUsed =
        currentUserNumericId != null
          ? occupantIds.filter((id) => id !== currentUserNumericId).length
          : occupantIds.length;
      const remaining = Math.max(item.total - adjustedUsed, 0);
      const roleKey = normalizeDepartmentKey(item.title);
      const isCurrentSelection = currentRoleKey !== "" && roleKey === currentRoleKey;
      const disabled = remaining <= 0 && !isCurrentSelection;
      return {
        title: item.title,
        remaining,
        total: item.total,
        disabled,
        isCurrentSelection
      };
    });
  }, [currentUserId, departmentRoleSummary, values.department, values.department_position]);

  const handleDepartmentChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextDepartment = event.target.value;
    setValues((prev) => ({
      ...prev,
      department: nextDepartment,
      department_position: ""
    }));
  };

  const handleSelectRole = (roleTitle: string) => () => {
    setValues((prev) => ({
      ...prev,
      department_position: roleTitle
    }));
  };

  const handleChange =
    (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validateUserForm(values);
    if (validationError) {
      toast.showErrorToast(validationError);
      return;
    }

    try {
      await onSubmit(values);
      toast.showSuccessToast("Lưu tài khoản thành công!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lưu tài khoản";
      toast.showErrorToast(message);
    }
  };

  if (!open) return null;

  return (
    <>

      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40"
        onClick={(event) => {
          if (event.target === event.currentTarget && !submitting) onClose();
        }}
      >
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden">
          <header className="bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100 px-6 py-4 border-b border-orange-100">
            <h2 className="text-xl font-semibold text-orange-600">{title}</h2>
            <p className="text-sm text-gray-500">Điền thông tin nhân sự để cập nhật hồ sơ.</p>
          </header>

          <form onSubmit={handleSubmit} className="flex max-h-[80vh] flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Họ tên <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={values.name}
                    onChange={handleChange("name")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Số điện thoại <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={values.phone}
                    onChange={handleChange("phone")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={values.email}
                    onChange={handleChange("email")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Tên đăng nhập
                  </label>
                  <input
                    value={values.username}
                    onChange={handleChange("username")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                    placeholder="Có thể để trống để tự sinh"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Địa chỉ <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={values.address}
                    onChange={handleChange("address")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Phòng ban <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={values.department}
                    onChange={handleDepartmentChange}
                    className="ms-select w-full"
                    disabled={
                      departmentSelectionDisabled ||
                      effectiveDepartmentOptions.length === 0 ||
                      submitting
                    }
                  >
                    <option value="" hidden>
                      Chọn phòng ban
                    </option>
                    {effectiveDepartmentOptions.map((option) => (
                      <option key={option.department_id ?? option.name} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {effectiveDepartmentOptions.length === 0 ? (
                    <p className="mt-1 text-xs text-orange-600">
                      Chưa có phòng ban. Hãy tạo phòng ban trước khi thêm nhân viên.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Chức vụ phòng ban <span className="text-red-600">*</span>
                  </label>
                  {values.department ? (
                    activeRoleOptions.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeRoleOptions.map((option) => (
                          <button
                            type="button"
                            key={`department-role-${normalizeDepartmentKey(option.title)}`}
                            onClick={handleSelectRole(option.title)}
                            disabled={option.disabled || submitting}
                            title={
                              option.remaining > 0
                                ? `Còn lại ${option.remaining}`
                                : option.isCurrentSelection
                                  ? "Bạn đang giữ vị trí này"
                                  : "Đã đủ số lượng"
                            }
                            className={classNames(
                              "inline-flex items-baseline gap-2 rounded-lg border px-3 py-2 text-left transition",
                              option.isCurrentSelection
                                ? "border-orange-400 bg-white text-orange-700 shadow-sm"
                                : "border-orange-100 bg-white text-orange-600 hover:border-orange-300 hover:bg-orange-50",
                              option.disabled || submitting
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer"
                            )}
                          >
                            <span className="text-sm font-medium">{option.title}</span>
                            <span
                              className={classNames(
                                "text-[11px] font-medium whitespace-nowrap",
                                option.remaining > 0
                                  ? "text-orange-500"
                                  : option.isCurrentSelection
                                    ? "text-orange-600"
                                    : "text-red-500"
                              )}
                            >
                              {`còn lại ${option.remaining}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-orange-600">
                        Phòng ban chưa có chức vụ gợi ý. Hãy thêm trong phần Phòng ban.
                      </p>
                    )
                  ) : (
                    <p className="mt-1 text-xs text-gray-400">
                      Chọn phòng ban để hiển thị chức vụ gợi ý.
                    </p>
                  )}

                  {values.department &&
                  values.department_position &&
                  !activeRoleOptions.some((option) => option.isCurrentSelection) ? (
                    <p className="mt-2 text-[11px] text-amber-600">
                      Chức vụ hiện tại không còn trong danh sách gợi ý. Hãy chọn lại chức vụ phù
                      hợp.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Trạng thái <span className="text-red-600">*</span>
                  </label>
                    <select
                    value={values.employment_status}
                    onChange={handleChange("employment_status")}
                    className="ms-select w-full"
                  >
                    {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Vai trò</label>
                    <select
                    value={values.role}
                    onChange={handleChange("role")}
                    className="ms-select w-full"
                    disabled={lockRoleToAdmin}
                    title={
                      lockRoleToAdmin
                        ? "Không thể thay đổi quyền quản trị viên hệ thống"
                        : undefined
                    }
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Giờ vào ca <span className="text-red-600">*</span>
                  </label>
                    <input
                    type="time"
                    value={values.work_shift_start}
                    onChange={handleChange("work_shift_start")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Giờ tan ca <span className="text-red-600">*</span>
                  </label>
                    <input
                    type="time"
                    value={values.work_shift_end}
                    onChange={handleChange("work_shift_end")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Số ngày nghỉ phép năm <span className="text-red-600">*</span>
                  </label>
                    <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={values.annual_leave_quota}
                    onChange={handleChange("annual_leave_quota")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Số ngày còn lại <span className="text-red-600">*</span>
                  </label>
                    <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={values.remaining_leave_days}
                    onChange={handleChange("remaining_leave_days")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Ngày vào làm <span className="text-red-600">*</span>
                  </label>
                    <input
                    type="date"
                    value={values.date_joined}
                    onChange={handleChange("date_joined")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Mật khẩu tạm (tùy chọn)
                  </label>
                    <input
                    type="text"
                    value={values.password}
                    onChange={handleChange("password")}
                    placeholder="Để trống để dùng mặc định"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
              </section>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Ghi chú</label>
                <textarea
                  value={values.note}
                  onChange={handleChange("note")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                />
              </div>
            </div>

            <footer className="flex justify-end gap-3 border-t border-orange-300 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {submitting ? "Đang lưu..." : "Lưu tài khoản"}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </>
  );
}
