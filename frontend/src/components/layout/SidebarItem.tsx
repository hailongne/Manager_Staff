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
      className={`relative flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-150 ${
        isActive
          ? "bg-orange-50 text-orange-700 font-semibold"
          : "text-gray-700 hover:bg-orange-50 hover:text-orange-700"
      }`}
    >
      {isActive && <span className="absolute left-0 top-0 bottom-0 w-1 bg-orange-600 rounded-r-md" />}
      <span className="truncate">{children}</span>
    </Link>
  );
}
