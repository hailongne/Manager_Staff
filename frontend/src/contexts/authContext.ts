import { createContext } from "react";

export interface User {
  user_id: number;
  name: string;
  role: "user" | "admin" | "leader";
  avatar?: string;
  avatar_url?: string | null;
  cv_url?: string | null;
  email?: string;
  username?: string;
  phone?: string;
  department_id?: number | null;
  department?: string;
  department_position?: string;
  address?: string;
  date_joined?: string | null;
  official_confirmed_at?: string | null;
  employment_status?: string | null;
  annual_leave_quota?: number | null;
  remaining_leave_days?: number | null;
  work_shift_start?: string | null;
  work_shift_end?: string | null;
  note?: string | null;
}

export interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: (options?: { reason?: "expired" | "removed" }) => void;
  refreshUser: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
