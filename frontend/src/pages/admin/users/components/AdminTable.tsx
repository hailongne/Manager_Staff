import type { ApiUser } from "../types";
import { formatDate, SUPER_ADMIN_ID } from "../utils";

interface AdminTableProps {
  admins: ApiUser[];
  currentUserId: number;
  canDeleteAccount: (item: ApiUser) => boolean;
  adminsCount: number;
  onEdit: (user: ApiUser) => void;
  onDelete: (user: ApiUser) => void;
  onAddAdmin: () => void;
  renderStatusBadge: (status: string | null | undefined) => React.ReactNode;
}

export function AdminTable({
  admins,
  currentUserId,
  canDeleteAccount,
  adminsCount,
  onEdit,
  onDelete,
  onAddAdmin,
  renderStatusBadge
}: AdminTableProps) {
  return (
    <section className="mb-6">
      <div className="px-5 pb-2 mt-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase">Tài khoản quản trị</h2>
        <p className="text-xs text-gray-500">
          Quản lý quyền truy cập hệ thống và phân công vai trò.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {admins.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">
            Chưa có tài khoản quản trị nào. Hãy tạo quản trị viên đầu tiên để quản lý hệ thống.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Quản trị viên</th>
                <th className="px-4 py-3 text-left font-semibold">Liên hệ</th>
                <th className="px-4 py-3 text-left font-semibold">Trạng thái làm việc</th>
                <th className="px-4 py-3 text-right font-semibold">
                  <button
                    onClick={onAddAdmin}
                    className="inline-flex items-center gap-2 px-2 py-2 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-100"
                  >
                    <span>Thêm quản trị viên</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((item) => {
                const deleteAllowed = canDeleteAccount(item) && adminsCount > 1;
                let deleteHint: string | undefined;
                if (!deleteAllowed) {
                  if (String(item.user_id) === String(currentUserId)) {
                    deleteHint = "Không thể tự xóa tài khoản của bạn";
                  } else if (item.user_id === SUPER_ADMIN_ID) {
                    deleteHint = "Không thể xóa quản trị viên gốc";
                  } else if (adminsCount <= 1) {
                    deleteHint = "Cần duy trì ít nhất một quản trị viên";
                  } else if (item.employment_status !== "resigned") {
                    deleteHint = "Chỉ xóa tài khoản đã nghỉ việc";
                  } else {
                    deleteHint = "Tài khoản cần nghỉ việc ít nhất 30 ngày trước khi xóa";
                  }
                }

                return (
                  <tr key={item.user_id} className="border-t border-gray-100 hover:bg-purple-50/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">Mã: #{item.user_id}</p>
                    </td>
                    <td className="px-4 py-3 space-y-1">
                      <p className="text-sm text-gray-700">Email: {item.email ?? "-"}</p>
                      <p className="text-sm text-gray-700">Tài khoản: {item.username ?? "-"}</p>
                      <p className="text-xs text-gray-500">SĐT: {item.phone ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 space-y-1">
                      <div>{renderStatusBadge(item.employment_status)}</div>
                      <p className="text-sm text-gray-700">Phòng ban: {item.department ?? "-"}</p>
                      <p className="text-xs text-gray-500">
                        Chức vụ ban: {item.department_position ?? "-"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ngày vào: {formatDate(item.date_joined)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ca: {item.work_shift_start ?? "--"} → {item.work_shift_end ?? "--"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onEdit(item)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() => onDelete(item)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          disabled={!deleteAllowed}
                          title={deleteHint}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
