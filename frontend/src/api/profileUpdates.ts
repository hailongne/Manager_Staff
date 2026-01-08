import api from "./axios";

export interface ProfileUpdateRequest {
  request_id: number;
  user_id: number;
  changes: Record<string, unknown>;
  reason?: string | null;
  status: "pending" | "approved" | "rejected";
  admin_id?: number | null;
  admin_note?: string | null;
  created_at: string;
  updated_at: string;
  requester?: {
    user_id: number;
    name: string;
    email?: string;
    employment_status?: string | null;
    position?: string | null;
  };
  reviewer?: {
    user_id: number;
    name: string;
    email?: string;
  } | null;
}

export interface SubmitProfileUpdatePayload {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  position?: string;
  date_joined?: string;
  employment_status?: string;
  work_shift_start?: string;
  work_shift_end?: string;
  note?: string;
  reason?: string;
}

export interface UserProfileSnapshot {
  user_id: number;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  address?: string;
  date_joined?: string | null;
  official_confirmed_at?: string | null;
  employment_status?: string | null;
  work_shift_start?: string | null;
  work_shift_end?: string | null;
  note?: string | null;
  avatar?: string;
  username?: string;
  updated_at?: string;
  annual_leave_quota?: number | null;
  remaining_leave_days?: number | null;
}

export const submitProfileUpdate = async (
  payload: SubmitProfileUpdatePayload
): Promise<{ message: string; request: ProfileUpdateRequest }> => (await api.post("/profile-updates", payload)).data;

export const getMyProfileUpdates = async (): Promise<ProfileUpdateRequest[]> => (await api.get("/profile-updates/me")).data;

export const getPendingProfileUpdates = async (): Promise<ProfileUpdateRequest[]> => (await api.get("/profile-updates/pending")).data;

export const getProfileUpdateHistory = async (status?: "approved" | "rejected" | "all"): Promise<ProfileUpdateRequest[]> => {
  const params = status ? { status } : undefined;
  const { data } = await api.get<ProfileUpdateRequest[]>("/profile-updates/history", { params });
  return data;
};

export const reviewProfileUpdate = async (
  requestId: number,
  decision: "approved" | "rejected",
  note?: string
): Promise<{ message: string; request: ProfileUpdateRequest; profile?: UserProfileSnapshot | null }> => (
  await api.post(`/profile-updates/${requestId}/review`, { decision, note })
).data;
