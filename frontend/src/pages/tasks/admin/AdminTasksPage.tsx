import { TaskDetailsModal } from "../shared/TaskDetailsModal";
import { TaskApprovalModal } from "../shared/TaskApprovalModal";
import { useAdminTasks } from "./hooks";
import {
  AssignTaskModal,
  TaskStatsCards,
  TaskFilters,
  TaskTable,
  ApprovalsList
} from "./components";

export default function AdminTasksPage() {
  const {
    user,
    loading,
    users,
    filteredTasks,
    stats,
    userMap,
    pendingApprovalCount,
    showDetailsModal,
    detailsTask,
    showAssignModal,
    approvingTask,
    selectedUser,
    setSelectedUser,
    selectedAdminWeekOffset,
    setSelectedAdminWeekOffset,
    selectedStatus,
    setSelectedStatus,
    employmentFilter,
    setEmploymentFilter,
    adminSearchTerm,
    setAdminSearchTerm,
    employmentUserOptions,
    adminTab,
    setAdminTab,
    isApprovingAll,
    handleAssignTask,
    handleSaveDetailTask,
    handleApproveAll,
    handleApproveTask,
    handleRejectTask,
    showTaskDetails,
    closeDetailsModal,
    openAssignModal,
    closeAssignModal,
    setApprovingTask,
    closeApprovingModal
  } = useAdminTasks();

  if (!user || user.role !== "admin") return null;
  if (loading) return <div className="p-10 text-center">Đang tải...</div>;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-col gap-2">
          <div>
            <h2 className="text-lg font-semibold text-pink-600">Quản lý nhiệm vụ nhân viên</h2>
            <p className="text-xs text-gray-500">
              Giao việc trực tiếp để thống kê thói quen chính xác.
            </p>
          </div>
          {/* Tab Toggle */}
          <div className="inline-flex rounded-full border border-pink-200 bg-pink-50 text-xs font-medium text-pink-600 overflow-hidden">
            <button
              className={`px-3 py-1.5 rounded-full transition ${
                adminTab === "overview" ? "bg-white text-pink-600 shadow" : "text-pink-500"
              }`}
              onClick={() => setAdminTab("overview")}
              type="button"
            >
              Quản lý nhiệm vụ
            </button>
            <button
              className={`px-3 py-1.5 rounded-full transition flex items-center gap-1 ${
                adminTab === "approvals" ? "bg-white text-pink-600 shadow" : "text-pink-500"
              }`}
              onClick={() => setAdminTab("approvals")}
              type="button"
            >
              Nhiệm vụ cần phê duyệt
              {pendingApprovalCount > 0 ? (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-pink-500 text-white text-[10px] px-2">
                  {pendingApprovalCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        <button
          onClick={openAssignModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
        >
          <span>Giao nhiệm vụ</span>
        </button>
      </div>

      {/* Stats Cards */}
      <TaskStatsCards stats={stats} />

      {/* Filters */}
      <TaskFilters
        searchTerm={adminSearchTerm}
        onSearchChange={setAdminSearchTerm}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        employmentFilter={employmentFilter}
        onEmploymentFilterChange={setEmploymentFilter}
        selectedUser={selectedUser}
        onUserChange={setSelectedUser}
        selectedWeekOffset={selectedAdminWeekOffset}
        onWeekOffsetChange={setSelectedAdminWeekOffset}
        userOptions={employmentUserOptions}
        isApprovalTab={adminTab === "approvals"}
      />

      {/* Tab Content */}
      {adminTab === "overview" ? (
        <TaskTable
          tasks={filteredTasks}
          userMap={userMap}
          selectedWeekOffset={selectedAdminWeekOffset}
          onShowDetails={showTaskDetails}
        />
      ) : (
        <ApprovalsList
          tasks={filteredTasks}
          userMap={userMap}
          isApprovingAll={isApprovingAll}
          onApproveAll={handleApproveAll}
          onOpenApproval={setApprovingTask}
        />
      )}

      {/* Assign Task Modal */}
      {showAssignModal && user.role === "admin" ? (
        <AssignTaskModal
          users={employmentUserOptions.filter((item) => item.role !== "admin")}
          defaultUserId={
            selectedUser !== "all" &&
            employmentUserOptions.some((item) => String(item.user_id) === String(selectedUser))
              ? selectedUser
              : undefined
          }
          onAssign={handleAssignTask}
          onClose={closeAssignModal}
        />
      ) : null}

      {/* Task Details Modal */}
      {showDetailsModal && detailsTask ? (
        <TaskDetailsModal
          task={detailsTask}
          onSave={handleSaveDetailTask}
          onClose={closeDetailsModal}
          users={users}
          currentUserRole={user.role}
        />
      ) : null}

      {/* Approval Modal */}
      {approvingTask ? (
        <TaskApprovalModal
          task={approvingTask}
          owner={userMap.get(String(approvingTask.user_id))}
          onApprove={handleApproveTask}
          onReject={handleRejectTask}
          onClose={closeApprovingModal}
        />
      ) : null}
    </div>
  );
}
