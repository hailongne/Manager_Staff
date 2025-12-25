import type { Task, TaskUpdatePayload } from "../../../api/tasks";
import type { User as ApiUser } from "../../../api/users";

// Re-export for convenience
export type { Task, TaskUpdatePayload, ApiUser };

// Stats interface
export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

// Employment filter type
export type EmploymentFilter = "active" | "resigned";

// Admin tab type
export type AdminTab = "overview" | "approvals";

// Assign task modal props
export interface AssignTaskModalProps {
  users: ApiUser[];
  defaultUserId?: string;
  onAssign: (payload: Partial<Task>) => Promise<unknown>;
  onClose: () => void;
}

// Task stats cards props
export interface TaskStatsCardsProps {
  stats: TaskStats;
}

// Task filters props
export interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  employmentFilter: EmploymentFilter;
  onEmploymentFilterChange: (value: EmploymentFilter) => void;
  selectedUser: string;
  onUserChange: (value: string) => void;
  selectedWeekOffset: number;
  onWeekOffsetChange: (value: number) => void;
  userOptions: ApiUser[];
  isApprovalTab: boolean;
}

// Task table props
export interface TaskTableProps {
  tasks: Task[];
  userMap: Map<string, ApiUser>;
  selectedWeekOffset: number;
  onShowDetails: (task: Task) => void;
}

// Approvals list props
export interface ApprovalsListProps {
  tasks: Task[];
  userMap: Map<string, ApiUser>;
  isApprovingAll: boolean;
  onApproveAll: () => void;
  onOpenApproval: (task: Task) => void;
}
