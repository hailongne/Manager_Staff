import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAllTasksAdmin,
  createTask,
  updateTask,
  approveTask,
  rejectTask,
  type Task,
  type TaskUpdatePayload,
  type RejectTaskResponse
} from "../../../../api/tasks";
import { getUsers, type User as ApiUser } from "../../../../api/users";
import { useAuth } from "../../../../hooks/useAuth";
import type { TaskStats, EmploymentFilter, AdminTab } from "../types";
import {
  filterNonAdminUsers,
  calculateTaskStats,
  createUserMap,
  getActiveUsers,
  getResignedUsers,
  getWeekRange,
  sortTasks
} from "../utils";

export function useAdminTasks() {
  const { user } = useAuth();

  // Core state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ApiUser[]>([]);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [approvingTask, setApprovingTask] = useState<Task | null>(null);

  // Filter states
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedAdminWeekOffset, setSelectedAdminWeekOffset] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [employmentFilter, setEmploymentFilter] = useState<EmploymentFilter>("active");
  const [adminSearchTerm, setAdminSearchTerm] = useState<string>("");

  // Tab state
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);
  const [isApprovingAll, setIsApprovingAll] = useState<boolean>(false);

  // Computed values
  const stats: TaskStats = useMemo(() => calculateTaskStats(tasks), [tasks]);
  const userMap = useMemo(() => createUserMap(users), [users]);
  const activeUsers = useMemo(() => getActiveUsers(users), [users]);
  const resignedUsers = useMemo(() => getResignedUsers(users), [users]);

  const employmentUserOptions = useMemo(
    () => (employmentFilter === "resigned" ? resignedUsers : activeUsers),
    [employmentFilter, resignedUsers, activeUsers]
  );

  // Validate selected user when employment filter changes
  useEffect(() => {
    const validPool = employmentFilter === "resigned" ? resignedUsers : activeUsers;
    if (
      selectedUser !== "all" &&
      !validPool.some((item) => String(item.user_id) === String(selectedUser))
    ) {
      setSelectedUser("all");
    }
  }, [employmentFilter, activeUsers, resignedUsers, selectedUser]);

  // Load users
  useEffect(() => {
    if (user?.role !== "admin") return;
    getUsers()
      .then((data) => {
        const filtered = filterNonAdminUsers(data);
        setUsers(filtered);
        setSelectedUser((prev) =>
          prev === "all" || filtered.some((item) => String(item.user_id) === String(prev))
            ? prev
            : "all"
        );
      })
      .catch(console.error);
  }, [user?.role]);

  // Reset filters when switching to approvals tab
  useEffect(() => {
    if (user?.role !== "admin") return;
    if (adminTab === "approvals") {
      setSelectedStatus("all");
      setSelectedAdminWeekOffset(999);
    }
  }, [adminTab, user?.role]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (user?.role !== "admin") return tasks;

    const normalizedSearch = adminSearchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const owner = userMap.get(String(task.user_id));
      if (!owner) {
        if (employmentFilter === "resigned") return false;
        if (!normalizedSearch) return true;
        return task.title.toLowerCase().includes(normalizedSearch);
      }

      const isResigned = owner.employment_status === "resigned";
      const employmentMatch = employmentFilter === "resigned" ? isResigned : !isResigned;
      if (!employmentMatch) return false;

      if (!normalizedSearch) return true;
      const ownerName = owner.name?.toLowerCase() ?? "";
      const taskTitle = (task.title ?? "").toLowerCase();
      return taskTitle.includes(normalizedSearch) || ownerName.includes(normalizedSearch);
    });
  }, [tasks, user?.role, userMap, employmentFilter, adminSearchTerm]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!user || user.role !== "admin") return;

    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        user_id: selectedUser === "all" ? undefined : Number(selectedUser),
        tab: adminTab,
        limit: adminTab === "approvals" ? 500 : selectedAdminWeekOffset === 999 ? 1000 : 100
      };

      if (adminTab !== "approvals") {
        if (selectedStatus !== "all") {
          params.status = selectedStatus as Task["status"];
        }
        if (selectedAdminWeekOffset !== 999) {
          const weekRange = getWeekRange(selectedAdminWeekOffset);
          params.startDate = weekRange.start;
          params.endDate = weekRange.end;
        }
      }

      const data = await getAllTasksAdmin(params);
      setTasks(sortTasks(data.items));
      setPendingApprovalCount(data.pendingApprovalCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, [user, adminTab, selectedUser, selectedStatus, selectedAdminWeekOffset]);

  useEffect(() => {
    fetchTasks().catch(console.error);
  }, [fetchTasks]);

  // Handlers
  const handleAssignTask = useCallback(
    async (payload: Partial<Task>) => {
      const createdTask = await createTask(payload);
      await fetchTasks();
      return createdTask;
    },
    [fetchTasks]
  );

  const handleSaveDetailTask = useCallback(
    async (updates: TaskUpdatePayload) => {
      if (!detailsTask) return;
      const updated = await updateTask(detailsTask.task_id.toString(), updates);
      setTasks((prev) =>
        sortTasks(prev.map((task) => (task.task_id === detailsTask.task_id ? updated : task)))
      );
      setShowDetailsModal(false);
      setDetailsTask(null);
    },
    [detailsTask]
  );

  const handleApproveAll = useCallback(async () => {
    if (filteredTasks.length === 0) {
      alert("Không có nhiệm vụ nào cần phê duyệt");
      return;
    }
    if (
      !window.confirm(`Bạn chắc chắn muốn phê duyệt cả ${filteredTasks.length} nhiệm vụ không?`)
    ) {
      return;
    }

    setIsApprovingAll(true);
    try {
      let approvedCount = 0;
      let failedCount = 0;

      for (const task of filteredTasks) {
        try {
          const approved = await approveTask(task.task_id.toString(), {});
          setTasks((prev) =>
            sortTasks(prev.map((item) => (item.task_id === approved.task_id ? approved : item)))
          );
          approvedCount += 1;
        } catch (error) {
          console.error(`Lỗi phê duyệt nhiệm vụ ${task.task_id}:`, error);
          failedCount += 1;
        }
      }

      await fetchTasks();
      alert(
        `Phê duyệt thành công: ${approvedCount} nhiệm vụ${failedCount > 0 ? `, Lỗi: ${failedCount}` : ""}`
      );
    } catch (error) {
      console.error("Lỗi phê duyệt hàng loạt:", error);
      alert("Có lỗi xảy ra khi phê duyệt hàng loạt");
    } finally {
      setIsApprovingAll(false);
    }
  }, [filteredTasks, fetchTasks]);

  const handleApproveTask = useCallback(
    async (updates: TaskUpdatePayload) => {
      if (!approvingTask) return;
      const approved = await approveTask(approvingTask.task_id.toString(), { updates });
      setApprovingTask(null);
      setTasks((prev) =>
        sortTasks(prev.map((item) => (item.task_id === approved.task_id ? approved : item)))
      );
      await fetchTasks();
    },
    [approvingTask, fetchTasks]
  );

  const handleRejectTask = useCallback(
    async (reason: string) => {
      if (!approvingTask) return;
      const taskId = approvingTask.task_id;
      const result: RejectTaskResponse = await rejectTask(taskId.toString(), { reason });
      setApprovingTask(null);
      setTasks((prev) => {
        if (typeof result === "object" && "deleted" in result && result.deleted) {
          return sortTasks(prev.filter((item) => item.task_id !== taskId));
        }
        const updatedTask = result as Task;
        return sortTasks(
          prev.map((item) => (item.task_id === updatedTask.task_id ? updatedTask : item))
        );
      });
      await fetchTasks();
    },
    [approvingTask, fetchTasks]
  );

  const showTaskDetails = useCallback((task: Task) => {
    setDetailsTask(task);
    setShowDetailsModal(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setShowDetailsModal(false);
    setDetailsTask(null);
  }, []);

  const openAssignModal = useCallback(() => setShowAssignModal(true), []);
  const closeAssignModal = useCallback(() => setShowAssignModal(false), []);
  const closeApprovingModal = useCallback(() => setApprovingTask(null), []);

  return {
    // Auth
    user,

    // Core state
    tasks,
    loading,
    users,
    filteredTasks,

    // Stats
    stats,
    userMap,
    pendingApprovalCount,

    // Modal states
    showDetailsModal,
    detailsTask,
    showAssignModal,
    approvingTask,

    // Filter states
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

    // Tab state
    adminTab,
    setAdminTab,
    isApprovingAll,

    // Handlers
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
  };
}
