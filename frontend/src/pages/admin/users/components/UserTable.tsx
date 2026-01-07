import type { ApiUser } from "../types";
import { formatDate } from "../utils";
import { useState, useEffect, useRef } from "react";
import { SelfProfileView } from "./SelfProfileView";

interface UserTableProps {
  users: ApiUser[];
  searchTerm: string;
  employmentStatusFilter: string;
  canEditRecord: (item: ApiUser) => boolean;
  canDeleteAccount: (item: ApiUser) => boolean;
  isAdmin: boolean;
  onEdit: (user: ApiUser) => void;
  onUploadCv?: (user: ApiUser, file: File) => Promise<ApiUser | void>;
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
  onUploadCv,
  onDelete,
  onAddUser,
  renderStatusBadge
}: UserTableProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [cvUploaded, setCvUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [profileOpen]);

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
                className="inline-flex items-center gap-2 px-2 py-2 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-100"
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
                <tr key={item.user_id} className="border-t border-gray-100 hover:bg-orange-50/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{item.name}</p>
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
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-orange-50 text-orange-600">
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
                          setSelectedUser(item);
                          setCvUploaded(Boolean(item.cv_url));
                          setProfileOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-green-200 text-green-700 hover:bg-green-50"
                        title="Xem hồ sơ"
                      >
                        Xem hồ sơ
                      </button>
                      <button
                        onClick={() => {
                          if (!editAllowed) return;
                          onEdit(item);
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
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

      {/* Profile modal */}
      {profileOpen && selectedUser ? (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProfileOpen(false);
          }}
        >
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden">
            <header className="bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100 px-4 py-3 border-b border-orange-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="ml-3">
                    <h2 className="text-lg font-semibold text-orange-600">Hồ sơ nhân sự</h2>
                    <p className="text-xs text-gray-500">Thông tin chi tiết hồ sơ nhân viên.</p>
                  </div>
                </div>
              </div>

              
            </header>

            <div className="flex max-h-[80vh] flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <aside className="md:col-span-1">
                    <div className="bg-white border border-gray-100 rounded-lg p-4 flex flex-col items-center gap-4">
                      <div className="w-36 h-36 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                        {selectedUser.avatar_url ? (
                          <img src={selectedUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-gray-300 text-5xl">👤</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-2 rounded-md bg-white border border-orange-200 text-orange-600">＋</button>
                        <button className="px-3 py-2 rounded-md bg-white border border-gray-200 text-gray-600">－</button>
                      </div>
                      <div className="w-full text-sm">
                        <div className="mb-2 font-semibold text-gray-700">Liên hệ</div>
                        <div className="text-xs text-gray-500">Email</div>
                        <div className="text-sm text-gray-800 mb-2">{selectedUser.email ?? '-'}</div>
                        <div className="text-xs text-gray-500">Di động</div>
                        <div className="text-sm text-gray-800 mb-2">{selectedUser.phone ?? '-'}</div>
                        <div className="text-xs text-gray-500">Địa chỉ</div>
                        <div className="text-sm text-gray-800">{selectedUser.address ?? '-'}</div>
                      </div>
                      {selectedUser.cv_url || cvUploaded ? (
                        <button
                          onClick={() => window.open(selectedUser.cv_url as string, "_blank")}
                          className="px-3 py-1 rounded-lg bg-white border border-orange-200 text-orange-600 text-sm hover:bg-orange-50"
                        >
                          Xem CV / Hồ sơ
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              if (fileInputRef.current) fileInputRef.current.click();
                            }}
                            className="px-3 py-1 rounded-lg bg-white border border-orange-200 text-orange-600 text-sm hover:bg-orange-50"
                          >
                            Tải CV lên
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f || !selectedUser) return;
                              // Call upload and refresh selectedUser if the handler returns updated user
                              if (onUploadCv) {
                                (async () => {
                                  const updated = await onUploadCv(selectedUser, f);
                                  if (updated) {
                                    setSelectedUser((prev) => ({ ...(prev ?? selectedUser), ...updated }));
                                    setCvUploaded(Boolean(updated.cv_url));
                                  }
                                })();
                              }
                              // Keep profile modal open after upload
                              e.currentTarget.value = "";
                            }}
                          />
                        </>
                      )}
                    </div>
                  </aside>
                  <div className="md:col-span-2">
                    <div className="bg-white border border-gray-100 rounded-lg p-4">
                      <SelfProfileView user={selectedUser} renderStatusBadge={renderStatusBadge} />
                    </div>
                  </div>
                </div>
              </div>
              <footer className="flex justify-end gap-3 border-t border-orange-100 px-6 py-4">
                <button
                  onClick={() => {
                  if (selectedUser && canEditRecord(selectedUser)) {
                    onEdit(selectedUser);
                    setProfileOpen(false);
                  }
                  }}
                  className="px-4 py-2 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                  disabled={!selectedUser || !canEditRecord(selectedUser)}
                  title={
                  !selectedUser
                    ? undefined
                    : canEditRecord(selectedUser)
                    ? undefined
                    : "Chỉ chỉnh sửa được hồ sơ của bạn hoặc thành viên cùng phòng ban"
                  }
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => setProfileOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  Đóng
                </button>
              </footer>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
