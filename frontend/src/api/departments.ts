import api from "./axios";

export interface Department {
  department_id: number;
  name: string;
  description?: string | null;
  manager_user_id?: number | null;
  manager?: {
    user_id: number;
    name: string;
    email: string;
    department_position?: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
  manager_user_id?: number | null;
}

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string | null;
  manager_user_id?: number | null;
}

export interface CreateDepartmentResponse {
  message: string;
  department: Department;
}

export interface UpdateDepartmentResponse {
  message: string;
  department: Department;
}

export interface DeleteDepartmentResponse {
  message: string;
}

export const getDepartments = async (): Promise<Department[]> => (await api.get("/departments")).data;
export const createDepartment = async (payload: CreateDepartmentPayload): Promise<CreateDepartmentResponse> => (await api.post("/departments", payload)).data;
export const updateDepartment = async (id: number, payload: UpdateDepartmentPayload): Promise<UpdateDepartmentResponse> => (await api.put(`/departments/${id}`, payload)).data;
export const deleteDepartment = async (id: number): Promise<DeleteDepartmentResponse> => (await api.delete(`/departments/${id}`)).data;
