import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface SidebarItemProps {
  to: string;
  children: ReactNode;
  /** when true, treat the link as active for any sub-paths (prefix match) */
  matchPrefix?: boolean;
}

// Mục trong thanh sidebar
export default function SidebarItem({ to, children, matchPrefix = false }: SidebarItemProps) {
  const { pathname } = useLocation();

  const isActive = matchPrefix
    ? pathname === to || pathname.startsWith(to + '/')
    : pathname === to;

  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 ${
        isActive
          ? "bg-pink-600 text-white font-semibold shadow"
          : "hover:bg-pink-100 hover:text-pink-700"
      }`}
      style={{ fontWeight: "500" }}
    >
      {children}
    </Link>
  );
}
