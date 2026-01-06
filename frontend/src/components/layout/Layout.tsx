import SidebarItem from "./SidebarItem.tsx";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import NotificationBell from "../ui/NotificationBell.tsx";
import { useMemo } from "react";

export default function Layout() {
  const { user, logout } = useAuth();

  const isManager = useMemo(() => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const title = (user.department_position || "").toLowerCase();
    return title.includes("trưởng") || title.includes("lead") || title.includes("manager") || title.includes("head");
  }, [user]);

  const showManagerTools = isManager && user?.role !== "admin";


  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-800">
      {/* Sidebar điều hướng */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white text-gray-800 flex flex-col p-6 shadow-xl z-10 border-r border-gray-200">
        <h1 className="text-2xl font-bold mb-8 tracking-wide">ManagerStaff</h1>

        {/* Menu chính */}
        <nav className="flex flex-col gap-3 text-xm font-medium">
          <SidebarItem to="/dashboard">Tổng quan</SidebarItem>
          <SidebarItem to="/reports">Báo cáo</SidebarItem>
          {user?.role === "user" && (
            <SidebarItem to="/profile">Hồ sơ</SidebarItem>
          )}
          <SidebarItem to="/assignments">📌 Công việc của tôi</SidebarItem>
          {(user?.role === "admin" || showManagerTools) && (
            <>
              <hr className="my-2 border-gray-300" />
              <SidebarItem to="/production-chains">🔗 Chuỗi sản xuất</SidebarItem>
              <SidebarItem to="/production-chains/assign-week" matchPrefix>
                📝 Giao việc tuần
              </SidebarItem>
            </>
          )}
          {user?.role === "admin" && (
            <>
              <hr className="my-2 border-gray-300" />
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold pl-2 mt-2">
                Quản Trị
              </p>
              <SidebarItem to="/users">👥 Nhân viên</SidebarItem>
              <SidebarItem to="/profile-approvals">📋 Phê duyệt hồ sơ</SidebarItem>
            </>
          )}
        </nav>
      </aside>

      {/* Nội dung chính */}
      <div className="ml-64 flex flex-col min-h-screen w-full">
        {/* Thanh header */}
        <header className="h-16 flex justify-between items-center px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-700">{user?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            {/* Nút đăng xuất */}
            <button
              onClick={() => logout()}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-1.5 rounded-md shadow"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}