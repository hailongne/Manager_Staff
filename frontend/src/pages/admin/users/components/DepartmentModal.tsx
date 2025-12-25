import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import classNames from "classnames";
import type { DepartmentModalProps, DepartmentModalValues, DepartmentRoleRow, DepartmentOption } from "../types";
import {
  MANAGER_ROLE_TITLE,
  MANAGER_ROLE_QUANTITY,
  MANAGER_ROLE_KEY,
  normalizeDepartmentKey,
  ensureMinRoleRows,
  parseDepartmentDescription,
  cloneDepartmentValues,
  validateDepartmentForm
} from "../utils";

export function DepartmentModal({
  open,
  submitting,
  initialValues,
  onSubmit,
  onClose,
  departments,
  loadingDepartments,
  onReloadDepartments,
  onDeleteDepartment
}: DepartmentModalProps) {
  const [values, setValues] = useState<DepartmentModalValues>(() =>
    cloneDepartmentValues(initialValues)
  );
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentOption | null>(null);
  const canDeleteSelected = Boolean(onDeleteDepartment && selectedDepartment?.department_id && (selectedDepartment.employee_count ?? 0) === 0);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setValues(cloneDepartmentValues(initialValues));
      setSelectedDepartment(null);
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

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, name: event.target.value }));
  };

  const handleRoleChange =
    (index: number, field: keyof DepartmentRoleRow) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      if (index === 0) return;
      const nextRoles = values.roles.map((role, roleIndex) =>
        roleIndex === index ? { ...role, [field]: event.target.value } : role
      );
      setValues((prev) => ({ ...prev, roles: ensureMinRoleRows(nextRoles) }));
    };

  const handleAddRole = () => {
    setValues((prev) => ({
      ...prev,
      roles: ensureMinRoleRows([...prev.roles, { title: "", quantity: "" }])
    }));
  };

  const handleRemoveRole = (index: number) => () => {
    if (index === 0) return;
    const nextRoles = values.roles.filter((_, roleIndex) => roleIndex !== index);
    setValues((prev) => ({ ...prev, roles: ensureMinRoleRows(nextRoles) }));
  };

  const handleSelectDepartment = (dept: DepartmentOption) => {
    const parsedRoles = parseDepartmentDescription(dept.description);
    setValues({
      name: dept.name,
      roles: ensureMinRoleRows(parsedRoles)
    });
    setSelectedDepartment(dept);
  };

  const handleClearSelection = () => {
    setSelectedDepartment(null);
    setValues(cloneDepartmentValues(initialValues));
  };

  const handleDeleteSelected = async () => {
    if (!canDeleteSelected || !onDeleteDepartment || !selectedDepartment?.department_id) {
      return;
    }
    const departmentName = selectedDepartment.name?.trim();
    const confirmed = window.confirm(
      `Bạn chắc chắn muốn xóa phòng ban "${departmentName || ""}"? Hành động này không thể hoàn tác.`
    );
    if (!confirmed) return;

    try {
      await onDeleteDepartment(selectedDepartment.department_id);
      handleClearSelection();
      onClose(); // Close modal after successful delete
    } catch {
      // Error message handled by parent component
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateDepartmentForm(values);
    if (validationError) {
      // Validation error handled by parent
      return;
    }

    const trimmedRoles = values.roles.map((role) => ({
      title: role.title.trim(),
      quantity: role.quantity.trim()
    }));
    const completeRoles = trimmedRoles.filter((role) => role.title && role.quantity);

    const sanitizedRoles = completeRoles.map((role) => {
      const roleKey = normalizeDepartmentKey(role.title);
      if (roleKey === MANAGER_ROLE_KEY) {
        return { title: MANAGER_ROLE_TITLE, quantity: MANAGER_ROLE_QUANTITY };
      }
      return { title: role.title, quantity: String(Number(role.quantity)) };
    });

    const managerIncluded = sanitizedRoles.some(
      (role) => normalizeDepartmentKey(role.title) === MANAGER_ROLE_KEY
    );
    const normalizedRoles = managerIncluded
      ? [
          { title: MANAGER_ROLE_TITLE, quantity: MANAGER_ROLE_QUANTITY },
          ...sanitizedRoles.filter(
            (role) => normalizeDepartmentKey(role.title) !== MANAGER_ROLE_KEY
          )
        ]
      : [{ title: MANAGER_ROLE_TITLE, quantity: MANAGER_ROLE_QUANTITY }, ...sanitizedRoles];

    try {
      await onSubmit(
        { name: values.name.trim(), roles: normalizedRoles },
        selectedDepartment?.department_id
      );
      onClose(); // Đóng popup sau khi lưu thành công
    } catch {
      // Error handled by parent
    }
  };

  if (!open) return null;

  return (
    <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40"
        onClick={(event) => {
          if (event.target === event.currentTarget && !submitting) onClose();
        }}
      >
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-pink-100 overflow-hidden">
          <header className="bg-gradient-to-r from-pink-100 via-pink-50 to-white px-6 py-4 border-b border-pink-100">
            <h2 className="text-lg font-semibold text-pink-600">Chỉnh sửa phòng ban</h2>
            <p className="text-xs text-gray-500">
              Thêm phòng ban và gợi ý chức vụ để dùng khi tạo nhân sự.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {selectedDepartment ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pink-100 bg-pink-50/50 px-3 py-2 text-xs text-pink-600">
                <span>
                  Đang chỉnh sửa:{" "}
                  <span className="font-semibold">
                    {values.name.trim() || selectedDepartment.name}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                    disabled={submitting || !canDeleteSelected}
                    title={
                      !canDeleteSelected
                        ? "Chỉ có thể xóa phòng ban khi không còn dữ liệu liên kết"
                        : undefined
                    }
                  >
                    Xóa phòng ban
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="inline-flex items-center gap-1 rounded-lg border border-pink-200 px-3 py-1 text-xs font-medium text-pink-600 hover:bg-pink-50 disabled:opacity-60"
                    disabled={submitting}
                  >
                    Tạo phòng ban mới
                  </button>
                </div>
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Tên phòng ban <span className="text-red-600">*</span>
              </label>
              <input
                value={values.name}
                onChange={handleNameChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="Ví dụ: Phòng Nhân sự"
                disabled={submitting}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">Chức vụ & Số lượng</p>
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="inline-flex items-center gap-1 rounded-lg border border-pink-200 px-3 py-1 text-xs font-medium text-pink-600 hover:bg-pink-50 disabled:opacity-60"
                  disabled={submitting}
                >
                  Thêm chức vụ
                </button>
              </div>

              <div className="space-y-2">
                {values.roles.map((role, index) => {
                  const isManagerRow = index === 0;
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-2 md:grid-cols-[3fr_1fr_auto] md:items-center"
                    >
                      <input
                        value={role.title}
                        onChange={handleRoleChange(index, "title")}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200"
                        placeholder="Tên chức vụ"
                        disabled={submitting || isManagerRow}
                        title={isManagerRow ? "Chức vụ Trưởng phòng được cố định" : undefined}
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={role.quantity}
                        onChange={handleRoleChange(index, "quantity")}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200"
                        placeholder="Số lượng"
                        disabled={submitting || isManagerRow}
                        title={
                          isManagerRow ? "Số lượng Trưởng phòng được cố định là 1" : undefined
                        }
                      />
                      <button
                        type="button"
                        onClick={handleRemoveRole(index)}
                        className="text-xs text-red-500 hover:text-red-600 px-2 py-2"
                        disabled={submitting || isManagerRow}
                        title={isManagerRow ? "Không thể xóa chức vụ Trưởng phòng" : "Xóa chức vụ"}
                      >
                        Xóa
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Phòng ban hiện có
                </p>
                <button
                  type="button"
                  onClick={onReloadDepartments}
                  className="text-xs text-pink-500 hover:text-pink-600"
                  disabled={loadingDepartments || submitting}
                >
                  {loadingDepartments ? "Đang tải..." : "Tải lại"}
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-xs text-gray-600">
                {loadingDepartments ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-pink-200 border-t-pink-500" />
                    <span>Đang tải danh sách phòng ban...</span>
                  </div>
                ) : departments.length === 0 ? (
                  <p className="text-gray-400">Chưa có phòng ban nào.</p>
                ) : (
                  departments.slice(0, 8).map((dept) => {
                    const roles = parseDepartmentDescription(dept.description);
                    const isSelected = selectedDepartment?.department_id === dept.department_id;
                    return (
                      <button
                        type="button"
                        key={dept.department_id ?? dept.name}
                        onClick={() => handleSelectDepartment(dept)}
                        className={classNames(
                          "w-full text-left rounded-md border px-3 py-2 shadow-sm transition",
                          isSelected
                            ? "border-pink-300 bg-pink-50/70 text-pink-700"
                            : "border-gray-100 bg-white hover:border-pink-300 hover:bg-pink-50/40"
                        )}
                        disabled={submitting}
                      >
                        <p
                          className={classNames(
                            "font-medium",
                            isSelected ? "text-pink-700" : "text-gray-800"
                          )}
                        >
                          {dept.name}
                          {dept.employee_count !== undefined && (
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              ({dept.employee_count} nhân viên)
                            </span>
                          )}
                        </p>
                        {roles.length ? (
                          <p
                            className={classNames(
                              "mt-1 text-[10px] flex flex-wrap gap-x-3 gap-y-1",
                              isSelected ? "text-pink-600" : "text-gray-500"
                            )}
                          >
                            {roles.map((role, roleIndex) => (
                              <span key={`${dept.department_id ?? dept.name}-role-${roleIndex}`}>
                                {`${role.title}${role.quantity ? ` ${role.quantity}` : ""}`}
                              </span>
                            ))}
                          </p>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
              {departments.length > 8 ? (
                <p className="mt-2 text-[11px] text-gray-400">
                  Hiển thị {Math.min(8, departments.length)} trong tổng số {departments.length}{" "}
                  phòng ban.
                </p>
              ) : null}
            </div>

            <footer className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-60"
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? "Đang lưu..." : "Lưu phòng ban"}
              </button>
            </footer>
          </form>
        </div>
      </div>
  );
}
