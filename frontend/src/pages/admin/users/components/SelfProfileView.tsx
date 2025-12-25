import type { ApiUser } from "../types";
import { formatDate } from "../utils";

interface SelfProfileViewProps {
  user: ApiUser;
  renderStatusBadge: (status: string | null | undefined) => React.ReactNode;
}

export function SelfProfileView({ user, renderStatusBadge }: SelfProfileViewProps) {
  return (
    <div className="py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <header className="mb-4">
            <h1 className="text-xl font-semibold text-pink-600">Thông tin nhân viên</h1>
            <p className="text-sm text-gray-500">
              Bạn chỉ có thể xem thông tin của bản thân. Để đề xuất chỉnh sửa, hãy truy cập mục Hồ
              sơ.
            </p>
          </header>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-500">Mã nhân viên: #{user.user_id}</p>
            </div>
            <div>{renderStatusBadge(user.employment_status)}</div>
          </div>
          <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <dt className="text-xs uppercase text-gray-500">Email</dt>
              <dd className="mt-1">{user.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Số điện thoại</dt>
              <dd className="mt-1">{user.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Phòng ban</dt>
              <dd className="mt-1">{user.department ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Chức vụ phòng ban</dt>
              <dd className="mt-1">{user.department_position ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Ngày vào làm</dt>
              <dd className="mt-1">{formatDate(user.date_joined)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Ca làm việc</dt>
              <dd className="mt-1">
                {user.work_shift_start ?? "--"} → {user.work_shift_end ?? "--"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Phép còn lại</dt>
              <dd className="mt-1">
                {(user.remaining_leave_days ?? 0).toLocaleString("vi-VN", {
                  maximumFractionDigits: 2
                })}
                /
                {(user.annual_leave_quota ?? 0).toLocaleString("vi-VN", {
                  maximumFractionDigits: 2
                })}{" "}
                ngày
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-xs uppercase text-gray-500">Địa chỉ</dt>
              <dd className="mt-1">{user.address ?? "-"}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-xs uppercase text-gray-500">Ghi chú</dt>
              <dd className="mt-1">{user.note ?? "Không có"}</dd>
            </div>
          </dl>
          <div className="mt-6 rounded-xl bg-pink-50/60 border border-pink-100 px-4 py-3 text-xs text-pink-600">
            Nếu cần cập nhật thông tin, vui lòng truy cập mục Hồ sơ và gửi yêu cầu phê duyệt.
          </div>
        </div>
      </div>
    </div>
  );
}
