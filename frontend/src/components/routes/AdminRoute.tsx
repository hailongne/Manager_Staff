import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface AdminRouteProps {
	children: React.ReactNode;
}

// Kiểm tra quyền admin trước khi cho phép truy cập
export default function AdminRoute({ children }: AdminRouteProps) {
	const { user } = useAuth();

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (user.role !== "admin") {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
