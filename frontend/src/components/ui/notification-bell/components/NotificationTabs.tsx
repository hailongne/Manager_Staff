import type { NotificationTabsProps } from "../types";

export function NotificationTabs({ tabs, activeTab, onTabChange }: NotificationTabsProps) {
  return (
    <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100 bg-gray-50">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`relative px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            activeTab === tab.key
              ? "bg-pink-500 text-white"
              : "bg-white text-gray-500 hover:bg-pink-50 hover:text-pink-500"
          }`}
        >
          {tab.label}
          {tab.showDot ? (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
          ) : null}
        </button>
      ))}
    </div>
  );
}
