import type { Notification } from "../../../../api/notifications";
import type { NotificationItemProps } from "../types";
import { toVietnamDate, formatNotificationDate, getNotificationIcon } from "../utils";

function renderMessageContent(notification: Notification) {
  const message = notification.message ?? "";
  const baseClass = "text-gray-600 mt-1 leading-relaxed";
  const highlightClass = "font-semibold text-gray-800";

  if (message) {
    if (notification.type === "task") {
      const completionPhrase = " đã hoàn thành nhiệm vụ ";
      const completionIndex = message.indexOf(completionPhrase);
      if (completionIndex > -1) {
        const namePart = message.slice(0, completionIndex).trim() || "Nhân viên";
        const detailPart = message.slice(completionIndex + completionPhrase.length).trim();
        return (
          <p className={baseClass}>
            <span className={highlightClass}>{namePart}</span>
            <span>{completionPhrase}</span>
            <span className={highlightClass}>{detailPart}</span>
          </p>
        );
      }
    }

    if (notification.type === "profile_update") {
      const requestPhrase = " gửi yêu cầu cập nhật ";
      const requestIndex = message.indexOf(requestPhrase);
      if (requestIndex > -1) {
        const namePart = message.slice(0, requestIndex).trim() || "Nhân viên";
        const detailPart = message.slice(requestIndex + requestPhrase.length);
        return (
          <p className={baseClass}>
            <span className={highlightClass}>{namePart}</span>
            <span>{requestPhrase}</span>
            <span>{detailPart}</span>
          </p>
        );
      }
    }
  }

  return <p className={baseClass}>{message || ""}</p>;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onAcknowledge: _onAcknowledge,
  deletingId,
  acknowledgingId: _acknowledgingId,
  error
}: NotificationItemProps) {
  const createdAt = toVietnamDate(notification.created_at);
  const formattedDate = formatNotificationDate(createdAt);
  const isUnread = notification.status === "unread";
  return (
    <li
      className={`rounded-xl border px-4 py-3 transition shadow-sm ${
        isUnread
          ? "border-orange-100 bg-orange-50/60"
          : "border-gray-100 bg-white hover:border-orange-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl" role="img" aria-label="notification icon">
            {getNotificationIcon(notification.type)}
          </span>
          {isUnread ? <span className="w-2 h-2 rounded-full bg-orange-600" /> : null}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-800">
              {notification.title ?? "Thông báo"}
            </h4>
            <span className="text-xs text-gray-400 whitespace-nowrap">{formattedDate}</span>
          </div>
          {renderMessageContent(notification)}
          {notification.metadata &&
          typeof notification.metadata === "object" &&
          "deadline" in notification.metadata ? (
            <p className="mt-1 text-xs text-gray-500">
              Hạn: {(notification.metadata as { deadline?: string }).deadline ?? "Không rõ"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => onMarkRead(notification, true)}
          className="px-3 py-1.5 text-xs rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50"
        >
          Xem chi tiết
        </button>
        <button
          onClick={() => onDelete(notification.notification_id)}
          className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
          disabled={deletingId === notification.notification_id}
        >
          {deletingId === notification.notification_id ? "Đang xóa..." : "Xóa"}
        </button>
      </div>

      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </li>
  );
}
