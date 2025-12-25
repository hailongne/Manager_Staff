import type { ApiUser } from "../types";
import { formatDate } from "../utils";

interface UserTableProps {
  users: ApiUser[];
  searchTerm: string;
  employmentStatusFilter: string;
  canEditRecord: (item: ApiUser) => boolean;
  canDeleteAccount: (item: ApiUser) => boolean;
  isAdmin: boolean;
  onEdit: (user: ApiUser) => void;
  onDelete: (user: ApiUser) => void;
  onAddUser: () => void;
  renderStatusBadge: (status: string | null | undefined) => React.ReactNode;
}

export function UserTable({
  users,
  searchTerm,
  employmentStatusFilter,
  canEditRecord,
  canDeleteAccount,
  isAdmin,
  onEdit,
  onDelete,
  onAddUser,
  renderStatusBadge
}: UserTableProps) {
  const filteredUsers = users.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.user_id).includes(searchTerm);

    const matchesStatus =
      employmentStatusFilter === "all" || item.employment_status === employmentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Nhân viên</th>
            <th className="px-4 py-3 text-left font-semibold">Liên hệ</th>
            <th className="px-4 py-3 text-left font-semibold">Thông tin làm việc</th>
            <th className="px-4 py-3 text-left font-semibold">Phân quyền</th>
            <th className="px-4 py-3 text-right font-semibold">
              <button
                type="button"
                onClick={onAddUser}
                className="inline-flex items-center gap-2 px-2 py-2 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-100"
              >
                <span>Thêm nhân viên</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                Chưa có nhân viên nào.
              </td>
            </tr>
          ) : (
            filteredUsers.map((item) => {
              const deleteAllowed = canDeleteAccount(item);
              const editAllowed = canEditRecord(item);
              const editHint = editAllowed
                ? undefined
                : "Chỉ chỉnh sửa được hồ sơ của bạn hoặc thành viên cùng phòng ban";
              let deleteHint: string | undefined;
              if (!deleteAllowed && isAdmin) {
                if (item.employment_status !== "resigned") {
                  deleteHint = "Chỉ xóa nhân viên đã nghỉ việc";
                } else {
                  deleteHint = "Nhân viên cần nghỉ việc ít nhất 30 ngày trước khi xóa";
                }
              }

              return (
                <tr key={item.user_id} className="border-t border-gray-100 hover:bg-pink-50/40">
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
                    <p className="text-xs text-gray-500">
                      Ngày vào: {formatDate(item.date_joined)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Phép: {item.remaining_leave_days ?? 0}/{item.annual_leave_quota ?? 0} ngày
                    </p>
                    <p className="text-xs text-gray-500">
                      Ca: {item.work_shift_start ?? "--"} → {item.work_shift_end ?? "--"}
                    </p>
                  </td>
                  <td className="px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      {renderStatusBadge(item.employment_status)}
                      {item.role === 'leader' && (
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-600">
                          Trưởng nhóm
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Phòng ban: <span className="text-gray-800">{item.department ?? "-"}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Chức vụ phòng ban:{" "}
                      <span className="text-gray-800">{item.department_position ?? "-"}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          if (!editAllowed) return;
                          onEdit(item);
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50 disabled:opacity-50"
                        disabled={!editAllowed}
                        title={editHint}
                      >
                        Chỉnh sửa
                      </button>
                      {isAdmin ? (
                        <button
                          onClick={() => onDelete(item)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          disabled={!deleteAllowed}
                          title={deleteHint}
                        >
                          Xóa
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </section>
  );
}
