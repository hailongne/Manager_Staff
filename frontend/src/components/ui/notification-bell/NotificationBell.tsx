import { useNotificationBell } from "./hooks";
import {
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
        className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white text-orange-600 hover:bg-orange-50 border border-orange-100 transition"
        aria-label="Thông báo"
      >
        <svg className="h-5 w-5 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs rounded-full px-1.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open ? (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-orange-100 z-30">
          {/* Header */}
          <NotificationHeader
            onRefresh={() => fetchNotifications().catch(console.error)}
            onClearAll={handleClearAll}
            clearing={clearing}
            hasNotifications={notifications.length > 0}
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
              activeTab={activeTab}
              onTabChange={setActiveTab}
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
