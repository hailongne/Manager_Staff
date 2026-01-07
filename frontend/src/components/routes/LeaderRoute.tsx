import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface LeaderRouteProps {
  children: React.ReactNode;
}

// Cho phép truy cập nếu là leader
export default function LeaderRoute({ children }: LeaderRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "leader") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
