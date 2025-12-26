import type { ChangeEvent, FormEvent } from "react";
import type { Department as ApiDepartment } from "../../../api/departments";
import type { User as ApiUser } from "../../../api/users";

// Re-export for convenience
export type { ApiDepartment, ApiUser };

// Department link form state
export interface DepartmentLinkFormState {
  productName: string;
  selectedIds: string[];
}

// Chain form props
export interface ChainFormProps {
  linkForm: DepartmentLinkFormState;
  availableDepartments: ApiDepartment[];
  departmentById: Map<number, ApiDepartment>;
  departmentMembersById: Map<number, ApiUser[]>;
  selectedSummary: string;
  onProductNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleLinkDepartment: (departmentId: number) => () => void;
  onReorderDepartment: (departmentId: number, direction: "up" | "down") => () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

// Types cho KPI và Assignments
export interface ChainKpi {
  chain_kpi_id: number;
  chain_id: number;
  year: number;
  month: number;
  target_value: number;
  start_date?: string;
  end_date?: string;
  weeks?: KpiWeek[];
  creator?: {
    user_id: number;
    name: string;
  };
  created_at: string;
}

export interface KpiWeek {
  week_index: number;
  start_date: string;
  end_date: string;
  target_value: number;
  working_days: number;
  days: KpiDay[];
}

export interface KpiDay {
  date: string;
  target_value: number;
  is_working_day: boolean;
  is_completed?: boolean;
}

export interface NormalizedWeekTarget {
  weekIndex: number;
  startDate: string;
  endDate: string;
  targetValue: number;
  days: {
    dateIso: string;
    targetValue: number;
    isWorkingDay: boolean;
  }[];
}

export interface KpiCompletionState {
  [key: string]: {
    chain_id: number;
    weeks: number[];
    days: string[];
  };
}

// Department link for KPI editing
export interface DepartmentLink {
  departmentId: number;
  productName: string;
  chainId: number;
}

// KPI edit form state
export interface KpiEditFormState {
  targetValue: string;
  weeks: {
    weekIndex: number;
    startDate: string;
    endDate: string;
    targetValue: string;
    days: {
      dateIso: string;
      targetValue: string;
    }[];
  }[];
}

// KPI edit diagnostics
export interface KpiEditDiagnostics {
  monthTarget: number;
  weekSum: number;
  weekStats: Array<{
    weekIndex: number;
    weekTarget: number;
    effectiveTarget: number;
    daySum: number;
  }>;
}