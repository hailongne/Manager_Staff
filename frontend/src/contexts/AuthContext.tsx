// Context xác thực
import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./authContext";
import type { User } from "./authContext";
import { login as apiLogin } from "../api/auth";
import { getCurrentUser } from "../api/users";
import { isAxiosError } from "axios";

const DEFAULT_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23cccccc"/></svg>';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const SESSION_EXPIRY_KEY = "token_expires_at";
const SESSION_LOGOUT_REASON_KEY = "session_logout_reason";
const SESSION_EXPIRED_MESSAGE = "Hết phiên đăng nhập. Vui lòng đăng nhập lại.";
const ACCOUNT_REMOVED_MESSAGE = "Tài khoản của bạn không còn tồn tại trong hệ thống. Vui lòng đăng nhập lại.";

let hasShownExpiredAlert = false;

// Lấy giá trị cookie
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const raw = parts.pop()?.split(";").shift() || null;
    return raw ? decodeURIComponent(raw) : null;
  }
  return null;
};

// Đặt cookie với hết hạn
const setCookieWithExpiry = (name: string, value: string, expiresAt: number) => {
  if (!Number.isFinite(expiresAt)) return;
  const expiryDate = new Date(expiresAt);
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expiryDate.toUTCString()}`;
};

// Xóa cookie
const clearCookie = (name: string) => {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

// Đọc thời gian hết hạn từ storage
const readStoredExpiry = (): number | null => {
  const raw = localStorage.getItem(SESSION_EXPIRY_KEY) || getCookie(SESSION_EXPIRY_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeUser = (raw: unknown): User => {
  const data = (raw ?? {}) as Record<string, unknown>;
  const resolveOptionalString = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim().length > 0 ? value : undefined;
  const resolveNullableString = (value: unknown): string | null =>
    typeof value === "string" ? value : null;
  const resolveNumberOrNull = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const resolveNumberOrUndefined = (value: unknown): number | undefined => {
    const parsed = resolveNumberOrNull(value);
    return parsed === null ? undefined : parsed;
  };

  const resolvedId = Number(data.user_id ?? data.id);
  if (!Number.isFinite(resolvedId)) {
    throw new Error("Thiếu mã người dùng");
  }

  const rawRole = String(data.role ?? "user").toLowerCase();
  const role: "user" | "admin" | "leader" = rawRole === "admin" ? "admin" : rawRole === "leader" ? "leader" : "user";

  return {
    user_id: resolvedId,
    name: String(data.name ?? ""),
    role,
    avatar: resolveOptionalString(data.avatar) ?? DEFAULT_AVATAR,
    email: resolveOptionalString(data.email),
    username: resolveOptionalString(data.username),
    phone: resolveOptionalString(data.phone),
    position: resolveOptionalString(data.position),
    department_id: resolveNumberOrUndefined(data.department_id ?? (data as Record<string, unknown>).departmentId) ?? null,
    department: resolveOptionalString(data.department),
    department_position: resolveOptionalString(data.department_position ?? (data as Record<string, unknown>).departmentPosition),
    address: resolveOptionalString(data.address),
    date_joined: resolveNullableString(data.date_joined),
    official_confirmed_at: resolveNullableString(data.official_confirmed_at),
    employment_status: resolveNullableString(data.employment_status),
    annual_leave_quota: resolveNumberOrNull(data.annual_leave_quota),
    remaining_leave_days: resolveNumberOrNull(data.remaining_leave_days),
    work_shift_start: resolveNullableString(data.work_shift_start),
    work_shift_end: resolveNullableString(data.work_shift_end),
    note: resolveNullableString(data.note)
  };
};

const usersEqual = (a: User | null, b: User | null): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.user_id === b.user_id &&
    a.name === b.name &&
    a.role === b.role &&
    a.avatar === b.avatar &&
    a.email === b.email &&
    a.username === b.username &&
    a.phone === b.phone &&
    a.position === b.position &&
    a.department_id === b.department_id &&
    a.department === b.department &&
    a.department_position === b.department_position &&
    a.address === b.address &&
    a.date_joined === b.date_joined &&
    a.official_confirmed_at === b.official_confirmed_at &&
    a.employment_status === b.employment_status &&
    a.annual_leave_quota === b.annual_leave_quota &&
    a.remaining_leave_days === b.remaining_leave_days &&
    a.work_shift_start === b.work_shift_start &&
    a.work_shift_end === b.work_shift_end &&
    a.note === b.note
  );
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const hasVerifiedUserRef = useRef(false);

  const clearSessionStorage = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    clearCookie("token");
    clearCookie("user");
    clearCookie(SESSION_EXPIRY_KEY);
    setSessionExpiresAt(null);
  }, []);

  const logout = useCallback((options?: { reason?: "expired" | "removed" }) => {
    const reason = options?.reason;
    hasVerifiedUserRef.current = false;

    if (reason === "expired") {
      const currentStatus = sessionStorage.getItem(SESSION_LOGOUT_REASON_KEY);
      const alreadyPrompted = currentStatus === "expired_alerted";

      if (!alreadyPrompted && !hasShownExpiredAlert) {
        window.alert(SESSION_EXPIRED_MESSAGE);
        hasShownExpiredAlert = true;
      } else if (alreadyPrompted) {
        hasShownExpiredAlert = true;
      }

      sessionStorage.setItem(SESSION_LOGOUT_REASON_KEY, "expired_alerted");
    } else if (reason === "removed") {
      window.alert(ACCOUNT_REMOVED_MESSAGE);
      sessionStorage.setItem(SESSION_LOGOUT_REASON_KEY, "removed");
    } else {
      sessionStorage.removeItem(SESSION_LOGOUT_REASON_KEY);
      hasShownExpiredAlert = false;
    }

    setUser(null);
    clearSessionStorage();
    navigate("/login");
  }, [clearSessionStorage, navigate]);

  const persistUserState = useCallback((nextUser: User, expiresAtOverride?: number) => {
    setUser((prev) => (usersEqual(prev, nextUser) ? prev : nextUser));

    const serialized = JSON.stringify(nextUser);
    localStorage.setItem("user", serialized);

    const effectiveExpiry = typeof expiresAtOverride === "number" ? expiresAtOverride : sessionExpiresAt;
    if (effectiveExpiry) {
      setCookieWithExpiry("user", serialized, effectiveExpiry);
    }
  }, [sessionExpiresAt]);

  useEffect(() => {
    const token = localStorage.getItem("token") || getCookie("token");
    const expiresAt = readStoredExpiry();

    const currentReason = sessionStorage.getItem(SESSION_LOGOUT_REASON_KEY);

    const isExpiredReason = currentReason === "expired" || currentReason === "expired_alerted";

    if (!token || !expiresAt) {
      if (!isExpiredReason) {
        sessionStorage.removeItem(SESSION_LOGOUT_REASON_KEY);
      }
      clearSessionStorage();
      setUser(null);
      return;
    }

    if (expiresAt <= Date.now()) {
      logout({ reason: "expired" });
      return;
    }

    setSessionExpiresAt(expiresAt);
    localStorage.setItem(SESSION_EXPIRY_KEY, String(expiresAt));
    setCookieWithExpiry(SESSION_EXPIRY_KEY, String(expiresAt), expiresAt);
    setCookieWithExpiry("token", token, expiresAt);

    const savedUser = localStorage.getItem("user") || getCookie("user");
    if (savedUser) {
      try {
        const parsedUser = typeof savedUser === "string" ? JSON.parse(savedUser) : savedUser;
        const normalized = normalizeUser(parsedUser);
        persistUserState(normalized, expiresAt);
      } catch (error) {
        console.error("Persisted user invalid", error);
        if (!isExpiredReason) {
          sessionStorage.removeItem(SESSION_LOGOUT_REASON_KEY);
        }
        clearSessionStorage();
        setUser(null);
      }
    }
  }, [clearSessionStorage, logout, persistUserState]);

  const login = useCallback(async (identifier: string, password: string) => {
    try {
      const response = await apiLogin(identifier, password);
      const { token, user: rawUser } = response;
      if (!token || !rawUser) {
        throw new Error("Invalid response format");
      }

      const normalizedUser = normalizeUser(rawUser);
      const expiresAt = Date.now() + SESSION_DURATION_MS;

      localStorage.setItem("token", token);
      localStorage.setItem(SESSION_EXPIRY_KEY, String(expiresAt));
      setSessionExpiresAt(expiresAt);

      setCookieWithExpiry("token", token, expiresAt);
      setCookieWithExpiry(SESSION_EXPIRY_KEY, String(expiresAt), expiresAt);

      persistUserState(normalizedUser, expiresAt);
      sessionStorage.removeItem(SESSION_LOGOUT_REASON_KEY);
      hasShownExpiredAlert = false;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, [persistUserState]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const token = localStorage.getItem("token") || getCookie("token");
    const expiresAt = sessionExpiresAt ?? readStoredExpiry();

    if (!token || !expiresAt || expiresAt <= Date.now()) {
      logout({ reason: "expired" });
      return null;
    }

    try {
      const currentUser = await getCurrentUser();
      const normalized = normalizeUser(currentUser);
      persistUserState(normalized, expiresAt);
      return normalized;
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404 || status === 410) {
          logout({ reason: "removed" });
          return null;
        }
        if (status === 401) {
          logout({ reason: "expired" });
          return null;
        }
      }
      console.error("Refresh user error", error);
      return null;
    }
  }, [logout, persistUserState, sessionExpiresAt]);

  useEffect(() => {
    if (hasVerifiedUserRef.current) return;
    if (!sessionExpiresAt) return;

    const token = localStorage.getItem("token") || getCookie("token");
    if (!token) return;

    hasVerifiedUserRef.current = true;

    void refreshUser();
  }, [refreshUser, sessionExpiresAt]);

  useEffect(() => {
    if (!user) return;
    const expiresAt = sessionExpiresAt ?? readStoredExpiry();
    if (!expiresAt) return;

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      logout({ reason: "expired" });
      return;
    }

    const timer = window.setTimeout(() => {
      logout({ reason: "expired" });
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [logout, sessionExpiresAt, user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
