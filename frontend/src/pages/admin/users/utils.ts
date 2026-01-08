import type { FormState, DepartmentRoleRow, ApiUser, CreateUserPayload, UpdateUserPayload } from "./types";

// ============================================================
// Constants
// ============================================================

export const SUPER_ADMIN_ID = 1;
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const MIN_DEPARTMENT_ROLES = 2;
export const MANAGER_ROLE_TITLE = "Trưởng phòng";
export const MANAGER_ROLE_QUANTITY = "1";
export const MANAGER_ROLE_KEY = "truongphong";

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "probation", label: "Thử việc" },
  { value: "official", label: "Chính thức" },
  { value: "contract", label: "Hợp đồng" },
  { value: "intern", label: "Thực tập" },
  { value: "part_time", label: "Bán thời gian" },
  { value: "suspended", label: "Đang đình chỉ" },
  { value: "resigned", label: "Đã nghỉ" }
] as const;

export const ROLE_OPTIONS = [
  { value: "user", label: "Nhân viên" },
  { value: "leader", label: "Trưởng nhóm" },
  { value: "admin", label: "Quản trị" }
] as const;

export const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  username: "",
  phone: "",
  department: "",
  department_position: "",
  address: "",
  employment_status: "probation",
  role: "user",
  date_joined: "",
  annual_leave_quota: "12",
  remaining_leave_days: "12",
  work_shift_start: "08:30",
  work_shift_end: "17:30",
  note: "",
  password: ""
};

export const ADMIN_FORM: FormState = {
  ...EMPTY_FORM,
  role: "admin"
};

export const DEPARTMENT_MODAL_DEFAULT_VALUES = {
  name: "",
  roles: [] as DepartmentRoleRow[]
};

// ============================================================
// String Utilities
// ============================================================

/**
 * Remove Vietnamese diacritics from a string
 */
export function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Normalize a department/role key for comparison
 */
export function normalizeDepartmentKey(value: string | null | undefined): string {
  if (!value) return "";
  return removeDiacritics(value).toLowerCase().replace(/\s+/g, "").trim();
}

/**
 * Check if title matches department head pattern
 */
export function isDepartmentHeadTitle(title: string | null | undefined): boolean {
  if (!title) return false;

  const departmentHeadKeywords = [
    'truong ban',
    'truong phong',
    'truong bo phan',
    'truong nhom',
    'nhom truong',
    'head',
    'manager',
    'director'
  ];

  const normalized = removeDiacritics(title)
    .toLowerCase();

  return departmentHeadKeywords.some(keyword => normalized.includes(keyword));
}

// ============================================================
// Error Handling
// ============================================================

/**
 * Resolve error message from various error types
 */
export function resolveErrorMessage(error: unknown, fallback: string): string {
  // Ưu tiên lấy message từ error.response.data.message (axios)
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string" &&
    error.response.data.message.trim()
  ) {
    return error.response.data.message;
  }
  // Nếu có error.message
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) {
      return msg;
    }
  }
  return fallback;
}

// ============================================================
// Formatting Utilities
// ============================================================

/**
 * Format employment status value to label
 */
export function formatStatusLabel(value: string | null | undefined): string {
  const found = EMPLOYMENT_STATUS_OPTIONS.find(option => option.value === value);
  return found ? found.label : "Chưa rõ";
}

/**
 * Format date to Vietnamese format
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return value;
  }
}

// ============================================================
// Form State Utilities
// ============================================================

/**
 * Normalize API user to form state
 */
export function normalizeFormState(user?: ApiUser): FormState {
  if (!user) return EMPTY_FORM;
  return {
    name: user.name ?? "",
    email: user.email ?? "",
    username: user.username ?? "",
    phone: user.phone ?? "",
    department: user.department ?? "",
    department_position: user.department_position ?? "",
    address: user.address ?? "",
    employment_status: user.employment_status ?? "probation",
    role: user.role,
    date_joined: user.date_joined ?? "",
    annual_leave_quota: user.annual_leave_quota != null ? String(user.annual_leave_quota) : "12",
    remaining_leave_days: user.remaining_leave_days != null ? String(user.remaining_leave_days) : "12",
    work_shift_start: user.work_shift_start ?? "08:30",
    work_shift_end: user.work_shift_end ?? "17:30",
    note: user.note ?? "",
    password: ""
  };
}

/**
 * Build API payload from form state
 */
export function buildPayload(values: FormState, mode: "create" | "update"): CreateUserPayload | UpdateUserPayload {
  // For create mode: Auto-set role to 'leader' if department_position indicates leadership
  // For update mode: Use the role selected by admin (don't override)
  let role: "admin" | "user" | "leader" = values.role;
  if (mode === "create" && values.department_position && isDepartmentHeadTitle(values.department_position)) {
    role = "leader";
  }

  const payload: CreateUserPayload = {
    name: values.name.trim(),
    email: values.email.trim(),
    username: values.username.trim() || undefined,
    role: role,
    phone: values.phone.trim() || undefined,
    department_id: undefined,
    department: values.department.trim() || undefined,
    department_position: values.department_position.trim() || undefined,
    address: values.address.trim() || undefined,
    date_joined: values.date_joined || undefined,
    employment_status: values.employment_status || undefined,
    annual_leave_quota: values.annual_leave_quota ? Number(values.annual_leave_quota) : undefined,
    remaining_leave_days: values.remaining_leave_days ? Number(values.remaining_leave_days) : undefined,
    work_shift_start: values.work_shift_start || undefined,
    work_shift_end: values.work_shift_end || undefined,
    note: values.note.trim() || undefined,
    password: values.password.trim() || undefined
  };

  if (mode === "update") {
    Object.keys(payload).forEach((key) => {
      const typedKey = key as keyof typeof payload;
      if (payload[typedKey] === undefined) {
        delete payload[typedKey];
      }
    });
    return payload as UpdateUserPayload;
  }

  return payload;
}

/**
 * Normalize user record from API
 */
export function normalizeUserRecord(user: ApiUser): ApiUser {
  const resolveId = (() => {
    if (typeof user.user_id === "number") return user.user_id;
    const parsed = Number(user.user_id);
    return Number.isNaN(parsed) ? 0 : parsed;
  })();

  return {
    ...user,
    user_id: resolveId,
    department_id: user.department_id != null ? Number(user.department_id) : null,
    department: user.department ?? null,
    department_position: user.department_position ?? null,
    annual_leave_quota: user.annual_leave_quota != null ? Number(user.annual_leave_quota) : null,
    remaining_leave_days: user.remaining_leave_days != null ? Number(user.remaining_leave_days) : null
  };
}

// ============================================================
// Department Utilities
// ============================================================

/**
 * Sort departments alphabetically by name
 */
export function sortDepartments<T extends { name: string }>(departments: T[]): T[] {
  return [...departments].sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

/**
 * Ensure minimum role rows in department
 */
export function ensureMinRoleRows(rows: DepartmentRoleRow[], minimum: number = MIN_DEPARTMENT_ROLES): DepartmentRoleRow[] {
  const cloned = rows.map((role) => ({ title: role.title ?? "", quantity: role.quantity ?? "" }));
  const managerRow: DepartmentRoleRow = { title: MANAGER_ROLE_TITLE, quantity: MANAGER_ROLE_QUANTITY };
  const otherRoles = cloned.filter((role) => normalizeDepartmentKey(role.title) !== MANAGER_ROLE_KEY);

  const result: DepartmentRoleRow[] = [managerRow, ...otherRoles];

  while (result.length < minimum) {
    result.push({ title: "", quantity: "" });
  }

  return result;
}

/**
 * Parse department description to role rows
 */
export function parseDepartmentDescription(description?: string | null): DepartmentRoleRow[] {
  if (!description) return ensureMinRoleRows([]);
  const parsed = description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map<DepartmentRoleRow>((entry) => {
      const [rawTitle, ...rest] = entry.split("·").map((part) => part.trim());
      const quantity = rest.join("·").trim();
      return {
        title: rawTitle || entry,
        quantity: quantity || ""
      };
    });
  return ensureMinRoleRows(parsed);
}

/**
 * Clone department modal values
 */
export function cloneDepartmentValues(source: { name: string; roles: DepartmentRoleRow[] }): { name: string; roles: DepartmentRoleRow[] } {
  return {
    name: source.name,
    roles: ensureMinRoleRows(source.roles).map(role => ({ ...role }))
  };
}

// ============================================================
// Validation Utilities
// ============================================================

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^0\d{9}$/;

/**
 * Validate user form values
 */
export function validateUserForm(values: FormState): string | null {
  if (!values.name.trim()) {
    return "Vui lòng nhập họ tên";
  }

  if (!values.email.trim()) {
    return "Vui lòng nhập email";
  }

  if (!EMAIL_REGEX.test(values.email.trim())) {
    return "Email không hợp lệ";
  }

  if (!values.phone.trim()) {
    return "Vui lòng nhập số điện thoại";
  }

  if (!PHONE_REGEX.test(values.phone.trim())) {
    return "Số điện thoại phải là 10 chữ số bắt đầu bằng 0";
  }

  if (!values.department.trim()) {
    return "Vui lòng nhập phòng ban";
  }

  if (!values.department_position.trim()) {
    return "Vui lòng nhập chức vụ trong phòng ban";
  }

  if (!values.address.trim()) {
    return "Vui lòng nhập địa chỉ";
  }

  if (!values.employment_status) {
    return "Vui lòng chọn trạng thái làm việc";
  }

  if (!values.date_joined) {
    return "Vui lòng nhập ngày vào làm";
  }

  const dateJoined = new Date(values.date_joined);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (dateJoined > today) {
    return "Ngày vào làm không được trong tương lai";
  }

  if (!values.work_shift_start) {
    return "Vui lòng nhập giờ vào ca";
  }

  if (!values.work_shift_end) {
    return "Vui lòng nhập giờ tan ca";
  }

  if (values.work_shift_start >= values.work_shift_end) {
    return "Giờ tan ca phải sau giờ vào ca";
  }

  if (!values.annual_leave_quota) {
    return "Vui lòng nhập số ngày nghỉ phép năm";
  }

  const annualLeaveNum = Number(values.annual_leave_quota);
  if (Number.isNaN(annualLeaveNum) || annualLeaveNum < 0) {
    return "Số ngày nghỉ phép năm phải là số không âm";
  }

  if (!values.remaining_leave_days) {
    return "Vui lòng nhập số ngày phép còn lại";
  }

  const remainingDaysNum = Number(values.remaining_leave_days);
  if (Number.isNaN(remainingDaysNum) || remainingDaysNum < 0) {
    return "Số ngày phép còn lại phải là số không âm";
  }

  return null;
}

/**
 * Validate department form values
 */
export function validateDepartmentForm(values: { name: string; roles: DepartmentRoleRow[] }): string | null {
  if (!values.name.trim()) {
    return "Vui lòng nhập tên phòng ban";
  }

  const trimmedRoles = values.roles.map(role => ({
    title: role.title.trim(),
    quantity: role.quantity.trim()
  }));

  const filledRoles = trimmedRoles.filter(role => role.title || role.quantity);

  if (!filledRoles.length) {
    return `Vui lòng nhập tối thiểu ${MIN_DEPARTMENT_ROLES} chức vụ`;
  }

  const incompleteRole = filledRoles.find(role => !role.title || !role.quantity);
  if (incompleteRole) {
    return !incompleteRole.title
      ? "Tên chức vụ không được để trống"
      : "Vui lòng nhập số lượng cho chức vụ";
  }

  const completeRoles = filledRoles.filter(role => role.title && role.quantity);

  if (completeRoles.length < MIN_DEPARTMENT_ROLES) {
    return `Cần nhập tối thiểu ${MIN_DEPARTMENT_ROLES} chức vụ`;
  }

  const invalidQuantity = completeRoles.find(role => {
    const numeric = Number(role.quantity);
    return !Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric <= 0;
  });

  if (invalidQuantity) {
    return "Số lượng phải là số nguyên dương";
  }

  return null;
}

/**
 * Sanitize department roles for submission
 */
export function sanitizeDepartmentRoles(roles: DepartmentRoleRow[]): DepartmentRoleRow[] {
  const trimmedRoles = roles.map(role => ({
    title: role.title.trim(),
    quantity: role.quantity.trim()
  }));

  const completeRoles = trimmedRoles.filter(role => role.title && role.quantity);

  const sanitizedRoles = completeRoles.map(role => {
    const roleKey = normalizeDepartmentKey(role.title);
    if (roleKey === MANAGER_ROLE_KEY) {
      return {
        title: MANAGER_ROLE_TITLE,
        quantity: MANAGER_ROLE_QUANTITY
      };
    }
    return {
      title: role.title,
      quantity: String(Number(role.quantity))
    };
  });

  const managerIncluded = sanitizedRoles.some(role => normalizeDepartmentKey(role.title) === MANAGER_ROLE_KEY);
  
  return managerIncluded
    ? [
        { title: MANAGER_ROLE_TITLE, quantity: MANAGER_ROLE_QUANTITY },
        ...sanitizedRoles.filter(role => normalizeDepartmentKey(role.title) !== MANAGER_ROLE_KEY)
      ]
    : [
        { title: MANAGER_ROLE_TITLE, quantity: MANAGER_ROLE_QUANTITY },
        ...sanitizedRoles
      ];
}
