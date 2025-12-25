import { useNotificationBell } from "./hooks";
import {
  NotificationTabs,
  NotificationHeader,
  NotificationFooter,
  NotificationList
} from "./components";

export default function NotificationBell() {
  const {
    user,
    containerRef,
    open,
    loading,
    error,
    clearing,
    deletingId,
    markingAll,
    acknowledgingId,
    activeTab,
    setActiveTab,
    unreadCount,
    notifications,
    groupedNotifications,
    emptyMessage,
    tabConfigs,
    toggleOpen,
    closeDropdown,
    fetchNotifications,
    handleMarkAllRead,
    handleMarkRead,
    handleDelete,
    handleAcknowledge,
    handleClearAll
  } = useNotificationBell();

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={toggleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 transition"
        aria-label="Thông báo"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open ? (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-30">
          {/* Header */}
          <NotificationHeader
            onRefresh={() => fetchNotifications().catch(console.error)}
            onClearAll={handleClearAll}
            clearing={clearing}
            hasNotifications={notifications.length > 0}
          />

          {/* Tabs */}
          <NotificationTabs
            tabs={tabConfigs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            <NotificationList
              loading={loading}
              sections={groupedNotifications}
              emptyMessage={emptyMessage}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              onAcknowledge={handleAcknowledge}
              deletingId={deletingId}
              acknowledgingId={acknowledgingId}
              error={error}
            />
          </div>

          {/* Footer */}
          {notifications.length > 0 ? (
            <NotificationFooter
              onMarkAllRead={handleMarkAllRead}
              onClose={closeDropdown}
              markingAll={markingAll}
              unreadCount={unreadCount}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
