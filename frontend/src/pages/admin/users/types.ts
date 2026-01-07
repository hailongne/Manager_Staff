import type { ChangeEvent, FormEvent } from "react";
import type { User as ApiUser, CreateUserPayload, UpdateUserPayload } from "../../../api/users";
import type { Department as ApiDepartment } from "../../../api/departments";

// Re-export for convenience
export type { ApiUser, CreateUserPayload, UpdateUserPayload, ApiDepartment };

// Department option for selects
export interface DepartmentOption {
  department_id: number;
  name: string;
  description?: string | null;
  employee_count?: number;
}

// Department role row for modal
export interface DepartmentRoleRow {
  title: string;
  quantity: string;
}

// Department role summary item
export interface DepartmentRoleSummaryItem {
  title: string;
  total: number;
  occupantIds: number[];
}

// Department modal form values
export interface DepartmentModalValues {
  name: string;
  roles: DepartmentRoleRow[];
}

// User form state
export interface FormState {
  name: string;
  email: string;
  username: string;
  phone: string;
  position: string;
  department: string;
  department_position: string;
  address: string;
  employment_status: string;
  role: "user" | "admin" | "leader";
  date_joined: string;
  annual_leave_quota: string;
  remaining_leave_days: string;
  work_shift_start: string;
  work_shift_end: string;
  note: string;
  password: string;
}

// Active role option for department position selection
export interface ActiveRoleOption {
  title: string;
  remaining: number;
  total: number;
  disabled: boolean;
  isCurrentSelection: boolean;
}

// Flash message state
export interface MessageState {
  type: "success" | "error";
  text: string;
}

// Stats object
export interface UserStats {
  total: number;
  active: number;
  probation: number;
  admins: number;
  byStatus: Array<{ status: string; value: number }>;
}

// Form modal props
export interface FormModalProps {
  open: boolean;
  title: string;
  initialValues: FormState;
  submitting: boolean;
  onSubmit: (values: FormState) => Promise<void>;
  onClose: () => void;
  lockRoleToAdmin?: boolean;
  departmentOptions: DepartmentOption[];
  departmentSelectionDisabled?: boolean;
  departmentRoleSummary: Record<string, DepartmentRoleSummaryItem[]>;
  currentUserId?: number | null;
}

// Confirm dialog props
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirming: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

// Department modal props
export interface DepartmentModalProps {
  open: boolean;
  submitting: boolean;
  initialValues: DepartmentModalValues;
  onSubmit: (values: DepartmentModalValues, departmentId?: number) => Promise<void>;
  onClose: () => void;
  departments: DepartmentOption[];
  loadingDepartments: boolean;
  onReloadDepartments: () => void;
  onDeleteDepartment?: (departmentId: number) => Promise<void>;
}

// User table props
export interface UserTableProps {
  users: ApiUser[];
  searchTerm: string;
  employmentStatusFilter: string;
  canEditRecord: (item: ApiUser) => boolean;
  canDeleteAccount: (item: ApiUser) => boolean;
  isAdmin: boolean;
  onEdit: (user: ApiUser) => void;
  onUploadCv?: (user: ApiUser, file: File) => Promise<ApiUser | void>;
  onDelete: (user: ApiUser) => void;
  onAddUser: () => void;
  renderStatusBadge: (status: string | null | undefined) => React.ReactNode;
}

// Admin table props
export interface AdminTableProps {
  admins: ApiUser[];
  currentUserId: number;
  canDeleteAccount: (item: ApiUser) => boolean;
  adminsCount: number;
  onEdit: (user: ApiUser) => void;
  onDelete: (user: ApiUser) => void;
  onAddAdmin: () => void;
  renderStatusBadge: (status: string | null | undefined) => React.ReactNode;
}

// Self profile view props
export interface SelfProfileViewProps {
  user: ApiUser;
  renderStatusBadge: (status: string | null | undefined) => React.ReactNode;
}

// Stats section props
export interface StatsSectionProps {
  stats: UserStats;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  employmentStatusFilter: string;
  onFilterChange: (value: string) => void;
}

// Event handler types
export type InputChangeHandler = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
export type FormSubmitHandler = (event: FormEvent) => void;
