// API người dùng
import api from "./axios";

// Kiểu dữ liệu người dùng
export interface User {
  user_id: number;
  name: string;
  role: "admin" | "user" | "leader";
  email?: string;
  username?: string;
  phone?: string;
  avatar_url?: string | null;
  cv_url?: string | null;
  department_id?: number | null;
  department?: string | null;
  department_position?: string | null;
  address?: string;
  date_joined?: string | null;
  official_confirmed_at?: string | null;
  employment_status?: string | null;
  annual_leave_quota?: number | null;
  remaining_leave_days?: number | null;
  work_shift_start?: string | null;
  work_shift_end?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  username?: string;
  role?: "admin" | "user" | "leader";
  phone?: string;
  avatar_url?: string;
  cv_url?: string;
  department_id?: number | null;
  department?: string | null;
  department_position?: string | null;
  address?: string;
  date_joined?: string;
  official_confirmed_at?: string;
  employment_status?: string;
  annual_leave_quota?: number;
  remaining_leave_days?: number;
  work_shift_start?: string;
  work_shift_end?: string;
  note?: string;
  password?: string;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;

export const getUsers = async (): Promise<User[]> => (await api.get("/users")).data;
export const getCurrentUser = async (): Promise<User> => (await api.get("/users/me")).data;
export const getUser = async (id: number): Promise<User> => (await api.get(`/users/${id}`)).data;
export interface CreateUserResponse {
  message: string;
  user: User;
  defaultPassword?: string;
}

export interface UpdateUserResponse {
  message: string;
  user: User;
}

export interface DeleteUserResponse {
  message: string;
}

export const createUser = async (payload: CreateUserPayload): Promise<CreateUserResponse> => (await api.post("/users", payload)).data;
export const updateUser = async (id: number, payload: UpdateUserPayload): Promise<UpdateUserResponse> => (await api.put(`/users/${id}`, payload)).data;
export const deleteUser = async (id: number): Promise<DeleteUserResponse> => (await api.delete(`/users/${id}`)).data;

export const uploadCv = async (id: number, file: File): Promise<{ message: string; user: User; cv_url: string }> => {
  const fd = new FormData();
  fd.append('cv', file);
  const res = await api.post(`/users/${id}/cv`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
  user?: User;
}

export const changePassword = async (payload: ChangePasswordPayload): Promise<ChangePasswordResponse> => (
  await api.post("/users/change-password", payload)
).data;
