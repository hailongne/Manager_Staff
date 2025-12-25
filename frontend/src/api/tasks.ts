// API nhiệm vụ
import api from "./axios";

// Kiểu dữ liệu nhiệm vụ
export interface Task {
  task_id: number;
  title: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  user_id: number;
  description?: string;
  result_link?: string | null;
  created_at?: string;
  updated_at?: string;
  due_date?: string;
  completed_at?: string;
  date?: string;
  cancel_reason?: string;
  pending_action?: "create" | "update" | "cancel" | null;
  pending_reason?: string | null;
  pending_changes?: Record<string, unknown> | null;
  pending_requested_by?: number | null;
}

export interface TasksResponse {
  items: Task[];
  total: number;
  page: number;
  pages: number;
  pendingApprovalCount?: number;
}

export type TaskUpdatePayload = Partial<Task> & {
  approval_reason?: string;
};

export type RejectTaskResponse =
  | Task
  | {
      message: string;
      deleted: true;
      task_id: number;
    };

export const getTasks = async (): Promise<Task[]> => {
  const { data } = await api.get("/tasks");
  return data.items; // Backend trả về { items: [...], total, page, pages }
};

export const getTasksFiltered = async (params: {
  status?: Task["status"];
  q?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<TasksResponse> => {
  const { data } = await api.get("/tasks", { params });
  return data;
};

export const getAllTasksAdmin = async (params?: {
  status?: Task["status"];
  user_id?: number;
  q?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  tab?: "overview" | "approvals";
}): Promise<TasksResponse> => {
  const { data } = await api.get("/tasks/admin", { params });
  return data;
};

export const createTask = async (payload: Partial<Task>): Promise<Task> => (await api.post("/tasks", payload)).data;
export const updateTask = async (id: string, payload: TaskUpdatePayload): Promise<Task> => (await api.put(`/tasks/${id}`, payload)).data;
export const deleteTask = async (id: string): Promise<void> => (await api.delete(`/tasks/${id}`)).data;
export const approveTask = async (id: string, payload?: { updates?: Partial<Task> }): Promise<Task> => (await api.post(`/tasks/${id}/approve`, payload)).data;
export const rejectTask = async (id: string, payload: { reason: string }): Promise<RejectTaskResponse> => (await api.post(`/tasks/${id}/reject`, payload)).data;
export const acknowledgeTask = async (id: string): Promise<Task> => (await api.post(`/tasks/${id}/acknowledge`)).data;
