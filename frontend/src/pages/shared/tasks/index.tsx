import { useAuth } from "../../../hooks/useAuth";
import AdminTasksPage from "../../tasks/admin/AdminTasksPage";
import UserTasksPage from "../../tasks/user/UserTasksPage";

export default function TasksPage() {
  const { user } = useAuth();

  if (!user) return null;
  if (user.role === "admin") return <AdminTasksPage />;
  return <UserTasksPage />;
}
