import { FlashMessage } from "../../../components/ui/FlashMessage";
import type { ApiUser } from "./types";
import {
  SUPER_ADMIN_ID,
  DEPARTMENT_MODAL_DEFAULT_VALUES,
  formatStatusLabel,
  normalizeFormState
} from "./utils";
import { useUsers } from "./hooks";
import {
  UserFormModal,
  ConfirmDialog,
  DepartmentModal,
  UserTable,
  AdminTable,
  SelfProfileView,
  StatsSection
} from "./components";

export default function UsersPage() {
  const {
    // User state
    user,
    users,
    loading,
    admins,
    employees,
    stats,

    // Message state
    message,
    messageVisible,
    dismissMessage,

    // Modal states
    showCreateModal,
    showEditModal,
    showDeleteDialog,
    departmentModalOpen,

    // Target user
    targetUser,
    submitting,
    createInitialValues,
    createTitle,

    // Filter state
    searchTerm,
    setSearchTerm,
    employmentStatusFilter,
    setEmploymentStatusFilter,

    // Department state
    departments,
    loadingDepartments,
    departmentModalSubmitting,
    allowedDepartmentOptions,
    departmentRoleSummary,

    // Computed values
    isAdmin,
    isDepartmentHead,
    showManagementTools,
    selfOnlyView,

    // Permission checks
    canEditRecord,
    canDeleteAccount,

    // CRUD handlers
    handleCreate,
    handleUpdate,
    handleDelete,
    handleDepartmentModalSubmit,
    handleDepartmentDelete,

    // Modal openers/closers
    openCreateUserModal,
    openCreateAdminModal,
    openEditModal,
    openDeleteDialog,
    openDepartmentModal,
    closeCreateModal,
    closeEditModal,
    closeDeleteDialog,
    closeDepartmentModal,

    // Department loader
    loadDepartments
  } = useUsers();

  // Render status badge helper
  const renderStatusBadge = (status: string | null | undefined) => {
    const label = formatStatusLabel(status);
    const tone =
      status === "official"
        ? "bg-emerald-50 text-emerald-600"
        : status === "probation"
          ? "bg-amber-50 text-amber-600"
          : status === "resigned"
            ? "bg-gray-100 text-gray-500"
            : "bg-pink-50 text-pink-600";
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
        {label}
      </span>
    );
  };

  // Not logged in
  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Bạn cần đăng nhập để truy cập trang này.
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="animate-spin h-10 w-10 border-4 border-pink-200 border-t-pink-500 rounded-full mx-auto" />
          <p className="mt-4">Đang tải danh sách nhân viên...</p>
        </div>
      </div>
    );
  }

  // Self-only view for non-admin/non-department-head users
  if (selfOnlyView) {
    const selfRecord: ApiUser = users.find(
      (item) => String(item.user_id) === String(user.user_id)
    ) ?? {
      user_id: user.user_id,
      name: user.name,
      role: user.role,
      email: user.email,
      username: user.username,
      phone: user.phone,
      position: user.position,
      department_id: user.department_id ?? null,
      department: user.department ?? null,
      department_position: user.department_position ?? null,
      address: user.address,
      date_joined: user.date_joined ?? null,
      employment_status: user.employment_status ?? null,
      annual_leave_quota: user.annual_leave_quota ?? null,
      remaining_leave_days: user.remaining_leave_days ?? null,
      work_shift_start: user.work_shift_start ?? null,
      work_shift_end: user.work_shift_end ?? null,
      note: user.note ?? null
    };

    return <SelfProfileView user={selfRecord} renderStatusBadge={renderStatusBadge} />;
  }

  const pageTitle = isAdmin ? "Quản lý nhân viên" : "Nhân sự phòng ban";
  const pageSubtitle = isAdmin
    ? "Theo dõi hồ sơ, trạng thái làm việc và phân quyền nhân sự."
    : "Quản lý thông tin của bạn và các thành viên trong phòng ban.";

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-pink-600">{pageTitle}</h1>
          <p className="text-sm text-gray-500">{pageSubtitle}</p>
          {!isAdmin && isDepartmentHead ? (
            <p className="mt-1 text-xs text-gray-500">
              Phòng ban: {user.department ?? "Chưa cập nhật"}
            </p>
          ) : null}
        </div>
        {isAdmin ? (
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openDepartmentModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 text-sm"
            >
              <span>Quản lý phòng ban</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Flash Message */}
      {message ? (
        <FlashMessage
          type={message.type}
          text={message.text}
          onClose={dismissMessage}
          position="toaster"
          visible={messageVisible}
        />
      ) : null}

      {/* Stats & Filter Section */}
      {showManagementTools ? (
        <StatsSection
          stats={stats}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          employmentStatusFilter={employmentStatusFilter}
          onFilterChange={setEmploymentStatusFilter}
        />
      ) : null}

      {/* User Table Header */}
      <div className="px-5 pb-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase">Tài khoản nhân viên</h2>
        <p className="text-xs text-gray-500">
          Quản lý quyền truy cập hệ thống và phân công vai trò.
        </p>
      </div>

      {/* User Table */}
      <UserTable
        users={employees}
        searchTerm={searchTerm}
        employmentStatusFilter={employmentStatusFilter}
        canEditRecord={canEditRecord}
        canDeleteAccount={canDeleteAccount}
        isAdmin={isAdmin}
        onEdit={openEditModal}
        onDelete={openDeleteDialog}
        onAddUser={openCreateUserModal}
        renderStatusBadge={renderStatusBadge}
      />

      {/* Admin Table (only for admins) */}
      {isAdmin ? (
        <AdminTable
          admins={admins}
          currentUserId={user.user_id}
          canDeleteAccount={canDeleteAccount}
          adminsCount={admins.length}
          onEdit={openEditModal}
          onDelete={openDeleteDialog}
          onAddAdmin={openCreateAdminModal}
          renderStatusBadge={renderStatusBadge}
        />
      ) : null}

      {/* Create User Modal */}
      <UserFormModal
        open={showCreateModal && isAdmin}
        title={createTitle}
        initialValues={createInitialValues}
        submitting={submitting}
        onSubmit={handleCreate}
        onClose={closeCreateModal}
        lockRoleToAdmin={createInitialValues.role === "admin" || !isAdmin}
        departmentOptions={allowedDepartmentOptions}
        departmentSelectionDisabled={!isAdmin}
        departmentRoleSummary={departmentRoleSummary}
        currentUserId={null}
      />

      {/* Edit User Modal */}
      <UserFormModal
        open={showEditModal}
        title={
          targetUser?.role === "admin"
            ? "Cập nhật quản trị viên"
            : "Cập nhật thông tin nhân viên"
        }
        initialValues={normalizeFormState(targetUser ?? undefined)}
        submitting={submitting}
        onSubmit={handleUpdate}
        onClose={closeEditModal}
        lockRoleToAdmin={targetUser?.user_id === SUPER_ADMIN_ID || !isAdmin}
        departmentOptions={allowedDepartmentOptions}
        departmentSelectionDisabled={!isAdmin}
        departmentRoleSummary={departmentRoleSummary}
        currentUserId={targetUser?.user_id ?? null}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteDialog && isAdmin}
        title={targetUser?.role === "admin" ? "Xóa quản trị viên" : "Xóa nhân viên"}
        message={
          targetUser
            ? `Bạn chắc chắn muốn xóa ${targetUser.role === "admin" ? "tài khoản quản trị" : "nhân viên"} ${targetUser.name}?`
            : "Bạn chắc chắn muốn xóa tài khoản này?"
        }
        confirming={submitting}
        onConfirm={handleDelete}
        onClose={closeDeleteDialog}
      />

      {/* Department Modal */}
      <DepartmentModal
        open={departmentModalOpen}
        submitting={departmentModalSubmitting}
        initialValues={DEPARTMENT_MODAL_DEFAULT_VALUES}
        onSubmit={handleDepartmentModalSubmit}
        onClose={closeDepartmentModal}
        departments={departments}
        loadingDepartments={loadingDepartments}
        onReloadDepartments={() => {
          void loadDepartments();
        }}
        onDeleteDepartment={handleDepartmentDelete}
      />
    </div>
  );
}
