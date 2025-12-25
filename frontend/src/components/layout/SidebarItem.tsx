import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

interface SidebarItemProps {
  to: string;
  children: ReactNode;
}

// Mục trong thanh sidebar
export default function SidebarItem({ to, children }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 ${
          isActive
            ? "bg-pink-600 text-white font-semibold shadow"
            : "hover:bg-pink-100 hover:text-pink-700"
        }`
      }
      style={{ fontWeight: "500" }}
      end
    >
      {children}
    </NavLink>
  );
}
