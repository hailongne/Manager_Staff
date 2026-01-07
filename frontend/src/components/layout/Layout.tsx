import SidebarItem from "./SidebarItem.tsx";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import NotificationBell from "../ui/NotificationBell.tsx";
import { useMemo } from "react";

export default function Layout() {
  const { user, logout } = useAuth();

  const isManager = useMemo(() => {
    if (!user) return false;
    const title = (user.department_position || "").toLowerCase();
    return title.includes("trưởng") || title.includes("lead") || title.includes("manager") || title.includes("head");
  }, [user]);

  const showManagerTools = (user?.role === "leader") || isManager;


  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-800">
      {/* Sidebar điều hướng */}
      <aside className="fixed left-0 top-0 h-screen w-56 bg-white text-gray-800 flex flex-col p-5 shadow-sm z-10 border-r border-orange-100">
        <div className="flex items-center gap-3 mb-6">
          <img src="/image/logofreetrip.jpg" alt="Freetrip logo" className="w-15 h-25 object-cover rounded-md" />
          <h1 className="text-4xl font-semibold tracking-tight">
            <span className="text-black">Free</span><span className="text-orange-600">trip</span>
          </h1>
        </div>

        {/* Menu chính */}
        <nav className="flex flex-col gap-2 text-sm font-medium">
          <SidebarItem to="/dashboard">Tổng quan</SidebarItem>
          <SidebarItem to="/reports">Báo cáo</SidebarItem>
          {user?.role === "user" && (
            <SidebarItem to="/profile">Hồ sơ</SidebarItem>
          )}
          <SidebarItem to="/assignments">Công việc</SidebarItem>
          {showManagerTools && (
            <SidebarItem to="/production-chains">Chuỗi sản xuất</SidebarItem>
          )}
          {user?.role === "leader" && (
            <SidebarItem to="/production-chains/assign-week" matchPrefix>
              Giao việc tuần
            </SidebarItem>
          )}
          {user?.role === "admin" && (
            <>
              
              <SidebarItem to="/users">Nhân viên</SidebarItem>
              <SidebarItem to="/profile-approvals">Phê duyệt hồ sơ</SidebarItem>
            </>
          )}
        </nav>
      </aside>

      {/* Nội dung chính */}
      <div className="ml-56 flex flex-col min-h-screen w-full">
        {/* Thanh header */}
        <header className="h-16 flex justify-between items-center px-6 shadow-sm bg-white">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar}
              alt={user?.name ?? "avatar"}
              className="w-9 h-9 rounded-full object-cover border border-gray-100"
            />
            <div>
              <div className="text-sm font-medium text-gray-700">{user?.name}</div>
              <div className="text-xs text-gray-500">{user?.position || user?.department || ''}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button
              onClick={() => logout()}
              className="text-sm bg-white border border-orange-500 text-orange-600 hover:bg-orange-50 px-3 py-1 rounded-md shadow-sm transition"
            >
              Đăng xuất
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