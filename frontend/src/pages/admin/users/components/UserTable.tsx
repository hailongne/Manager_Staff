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
  onUploadAvatar?: (user: ApiUser, file: File) => Promise<ApiUser | void>;
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
  onUploadAvatar,
  onDelete,
  onAddUser,
  renderStatusBadge
}: UserTableProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [cvUploaded, setCvUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarPendingFile, setAvatarPendingFile] = useState<File | null>(null);
  const [cvPendingFile, setCvPendingFile] = useState<File | null>(null);

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
                    <p className="text-sm text-gray-700">UserName: {item.username ?? "-"}</p>
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProfileOpen(false);
          }}
        >
          <div className="w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl shadow-black/30 ring-1 ring-slate-700 bg-slate-900/95">
              <header className="px-6 py-4 border-b border-slate-700 bg-slate-900/95">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 text-orange-400 shadow-sm font-semibold text-lg">
                      HR
                    </div>
                  <div>
                      <h2 className="text-2xl font-semibold tracking-wide text-orange-400">Hồ sơ nhân sự</h2>
                      <p className="text-sm text-slate-400">Thông tin chi tiết hồ sơ nhân viên</p>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex max-h-[90vh] flex-col">
              <div className="flex-1 overflow-y-auto px-2 py-6 bg-slate-900/95 text-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <aside className="md:col-span-1 justify-center items-center flex flex-col gap-2">
                      <div className="w-56 h-72 md:w-72 md:h-96 rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center relative">
                        {avatarPreviewUrl ? (
                          <img src={avatarPreviewUrl} alt="avatar-preview" className="w-full h-full object-cover" />
                        ) : selectedUser.avatar_url ? (
                          <img src={selectedUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-slate-400 text-[200px]">👤</div>
                        )}

                        {/* small update icon - always available to change avatar */}
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute left-2 top-2 w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm border border-orange-600 shadow-sm transition-colors duration-200 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                          title="Cập nhật ảnh đại diện"
                        >
                          ✎
                        </button>

                        {/* overlay confirm/cancel when pending */}
                        {avatarPendingFile ? (
                          <div className="absolute right-2 bottom-2 flex items-center gap-2 p-1">
                            <button
                              onClick={async () => {
                                if (!avatarPendingFile || !selectedUser) return;
                                try {
                                  if (typeof onUploadAvatar === "function") {
                                    const updated = await onUploadAvatar(selectedUser, avatarPendingFile);
                                    if (updated) setSelectedUser((prev) => ({ ...(prev ?? selectedUser), ...updated }));
                                  }
                                } finally {
                                  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
                                  setAvatarPreviewUrl(null);
                                  setAvatarPendingFile(null);
                                }
                              }}
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm shadow-md transition"
                              title="Cập nhật ảnh"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
                                setAvatarPreviewUrl(null);
                                setAvatarPendingFile(null);
                              }}
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 border border-slate-600 text-slate-200 text-sm shadow-md transition"
                              title="Hủy"
                            >
                              ✕
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f || !selectedUser) return;
                            const url = URL.createObjectURL(f);
                            setAvatarPreviewUrl(url);
                            setAvatarPendingFile(f);
                            e.currentTarget.value = "";
                          }}
                        />
                      </div>

                      {selectedUser.cv_url || cvUploaded ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.open(selectedUser.cv_url as string, "_blank")}
                            className="px-2 py-1 rounded-lg bg-transparent border border-orange-500 text-orange-400 text-sm hover:bg-orange-600/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                          >
                            Xem CV / Hồ sơ
                          </button>
                          {/* small update icon for replacing CV */}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2 py-1 rounded-md bg-transparent border border-orange-500 text-orange-400 text-xs hover:bg-orange-600/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                            title="Cập nhật CV"
                          >
                            ✎
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              if (fileInputRef.current) fileInputRef.current.click();
                            }}
                            className="px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm hover:bg-orange-500/15 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                          >
                            Tải CV lên
                          </button>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f || !selectedUser) return;
                          setCvPendingFile(f);
                          e.currentTarget.value = "";
                        }}
                      />

                      {cvPendingFile ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={async () => {
                              if (!cvPendingFile || !selectedUser) return;
                              try {
                                if (onUploadCv) {
                                  const updated = await onUploadCv(selectedUser, cvPendingFile);
                                  if (updated) {
                                    setSelectedUser((prev) => ({ ...(prev ?? selectedUser), ...updated }));
                                    setCvUploaded(Boolean(updated.cv_url));
                                  }
                                }
                                } finally {
                                setCvPendingFile(null);
                              }
                            }}
                            className="px-2 py-1 text-xs rounded-md bg-orange-600 text-white"
                          >
                            Cập nhật
                          </button>
                          <button
                            onClick={() => {
                              setCvPendingFile(null);
                            }}
                            className="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-700 bg-white"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : null}
                  </aside>
                  <div className="md:col-span-2">
                    <div className="bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-700 text-slate-100">
                      <SelfProfileView user={selectedUser} renderStatusBadge={renderStatusBadge} />
                    </div>
                  </div>
                </div>
              </div>
              <footer className="flex justify-end gap-3 border-t border-slate-700 px-6 py-4">
                <button
                  onClick={() => {
                    if (selectedUser && canEditRecord(selectedUser)) {
                      onEdit(selectedUser);
                      setProfileOpen(false);
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-md transition disabled:opacity-60"
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
                  className="px-4 py-2 rounded-md bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
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
