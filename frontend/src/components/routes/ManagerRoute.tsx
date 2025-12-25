import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface ManagerRouteProps {
  children: React.ReactNode;
}

const MANAGER_TITLE_KEYWORDS = [
  "truong ban",
  "truong phong",
  "truong bo phan",
  "truong nhom",
  "nhom truong",
  "head",
  "manager",
  "director"
];

const normalizeTitle = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Cho phép truy cập nếu là admin, leader hoặc giữ vị trí quản lý phòng ban
export default function ManagerRoute({ children }: ManagerRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "admin" || user.role === "leader") {
    return <>{children}</>;
  }

  const rawTitle = user.department_position || "";
  const baseTitle = rawTitle.toLowerCase();
  const normalizedTitle = normalizeTitle(rawTitle);
  const isManager = MANAGER_TITLE_KEYWORDS.some((keyword) => baseTitle.includes(keyword) || normalizedTitle.includes(keyword));

  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
