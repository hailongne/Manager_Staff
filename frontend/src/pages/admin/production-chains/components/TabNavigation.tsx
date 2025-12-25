type TabType = "list" | "disabled" | "create";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType, loadDisabled?: boolean) => void;
  chainsCount: number;
  disabledChainsCount: number;
  isAdmin: boolean;
}

export function TabNavigation({ activeTab, onTabChange, chainsCount, disabledChainsCount, isAdmin }: TabNavigationProps) {
  const tabs = [
    { id: "list" as TabType, label: "Danh Sách Chuỗi", count: chainsCount },
    ...(isAdmin ? [{ id: "create" as TabType, label: "Tạo Chuỗi Mới" }] : []),
    { id: "disabled" as TabType, label: "Đã Vô Hiệu Hóa", count: disabledChainsCount, loadDisabled: true }
  ];

  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id, tab.loadDisabled)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-pink-500 text-pink-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}