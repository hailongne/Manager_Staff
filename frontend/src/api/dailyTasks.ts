import axios from './axios';

export interface Task {
  task_id: number;
  title: string;
  description?: string;
  status: 'PENDING' | 'DOING' | 'WAITING_CONFIRM' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigned_by: number;
  assigned_to: number;
  department_id: number;
  related_step_id?: number;
  related_kpi_task_id?: number;
  date: string;
  created_at: string;
  updated_at: string;
  assigner?: { user_id: number; name: string };
  assignee?: { user_id: number; name: string };
  department?: { department_id: number; name: string };
  relatedStep?: { step_id: number; name: string };
  relatedKpiTask?: { completion_id: number; name: string };
}

export interface DepartmentMember {
  user_id: number;
  name: string;
  username?: string;
  position?: string;
  department_position?: string;
  kpiCount?: number;
}

export interface KpiSummary {
  kpis: Array<{
    kpi_id: number;
    name: string;
    chain_name?: string;
    target_value: number;
    unit_label?: string;
    day_completions: number;
    week_completions: number;
    is_completed: boolean;
  }>;
  summary: {
    total: number;
    completed: number;
    rate: number;
  };
}

export interface CreateTaskData {
  title: string;
  description?: string;
  assigned_to: number;
  department_id: number;
  related_step_id?: number;
  related_kpi_task_id?: number;
  date: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface UpdateTaskStatusData {
  status: 'PENDING' | 'DOING' | 'WAITING_CONFIRM' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
}

// Employee APIs
export const getMyTasksToday = () => {
  return axios.get('/daily-tasks/my-tasks/today');
};

export const startTask = (taskId: number) => {
  return axios.put(`/daily-tasks/${taskId}/start`);
};

export const completeTask = (taskId: number) => {
  return axios.put(`/daily-tasks/${taskId}/complete`);
};

export const blockTask = (taskId: number) => {
  return axios.put(`/daily-tasks/${taskId}/block`);
};

// Leader APIs
export const createDailyTask = (data: CreateTaskData) => {
  return axios.post('/daily-tasks', data);
};

export const getDailyTasks = (params?: { date?: string; department_id?: number }) => {
  return axios.get('/daily-tasks', { params });
};

export const confirmTask = (taskId: number) => {
  return axios.put(`/daily-tasks/${taskId}/confirm`);
};

export const rejectTask = (taskId: number) => {
  return axios.put(`/daily-tasks/${taskId}/reject`);
};

// KPI Reporting
export const getMonthlyKpiSummary = (params?: { chain_id?: number; month?: string }) => {
  return axios.get('/daily-tasks/kpi/monthly', { params });
};

// Legacy APIs (for backward compatibility)
export const getMyTasks = (params?: { task_type?: string; status?: string; page?: number; limit?: number }) => {
  return axios.get('/daily-tasks/my-tasks', { params });
};

export const getAssignedTasks = (params?: { task_type?: string; status?: string; page?: number; limit?: number }) => {
  return axios.get('/daily-tasks/assigned-tasks', { params });
};

export const getDepartmentMembers = () => {
  return axios.get('/daily-tasks/department-members');
};

export const getCurrentMonthKpiSummary = () => {
  return axios.get('/daily-tasks/kpi-summary');
};

export const createTask = (data: CreateTaskData) => {
  return axios.post('/daily-tasks', data);
};

export const updateTaskStatus = (taskId: number, data: UpdateTaskStatusData) => {
  return axios.patch(`/daily-tasks/${taskId}/status`, data);
};

export const deleteTask = (taskId: number) => {
  return axios.delete(`/daily-tasks/${taskId}`);
};