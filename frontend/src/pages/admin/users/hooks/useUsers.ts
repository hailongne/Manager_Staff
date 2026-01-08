import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../hooks/useAuth";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  type User as ApiUser,
  type CreateUserPayload,
  type UpdateUserPayload
} from "../../../../api/users";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type Department as ApiDepartment
} from "../../../../api/departments";
import type {
  FormState,
  DepartmentOption,
  DepartmentRoleSummaryItem,
  DepartmentModalValues,
  MessageState,
  UserStats,
  DepartmentRoleRow
} from "../types";
import {
  EMPTY_FORM,
  ADMIN_FORM,
  SUPER_ADMIN_ID,
  THIRTY_DAYS_MS,
  EMPLOYMENT_STATUS_OPTIONS,
  MANAGER_ROLE_TITLE,
  MANAGER_ROLE_QUANTITY,
  MANAGER_ROLE_KEY,
  normalizeDepartmentKey,
  isDepartmentHeadTitle,
  normalizeUserRecord,
  buildPayload,
  parseDepartmentDescription,
  sortDepartments,
  resolveErrorMessage
} from "../utils";

export function useUsers() {
  const { user, logout } = useAuth();

  // User list state
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Message state
  const [message, setMessage] = useState<MessageState | null>(null);
  const [messageVisible, setMessageVisible] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Target user for edit/delete
  const [targetUser, setTargetUser] = useState<ApiUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createInitialValues, setCreateInitialValues] = useState<FormState>(EMPTY_FORM);
  const [createTitle, setCreateTitle] = useState("Thêm nhân viên mới");

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Department state
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [departmentModalSubmitting, setDepartmentModalSubmitting] = useState(false);
  const [departmentNameAliases, setDepartmentNameAliases] = useState<Record<string, string>>({});
  const [departmentRoleAliases, setDepartmentRoleAliases] = useState<Record<string, Record<string, string>>>({});

  // Computed values
  const isAdmin = user?.role === "admin";
  const isDepartmentHead = useMemo(
    () => isDepartmentHeadTitle(user?.department_position ?? null),
    [user?.department_position]
  );
  const departmentKey = useMemo(
    () => normalizeDepartmentKey(user?.department ?? null),
    [user?.department]
  );
  const showManagementTools = Boolean(isAdmin || (isDepartmentHead && departmentKey));
  const selfOnlyView = Boolean(user && !showManagementTools);

  // Admins and employees (employees can be filtered by role)
  const admins = useMemo(() => users.filter((item) => item.role === "admin"), [users]);
  const employees = useMemo(() => {
    const base = users.filter((item) => item.role !== "admin");
    if (!roleFilter || roleFilter === "all") return base;
    return base.filter((item) => item.role === roleFilter);
  }, [users, roleFilter]);

  // Stats
  const stats: UserStats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(item => item.employment_status !== "resigned").length;
    const probation = employees.filter(item => item.employment_status === "probation").length;
    const adminCount = admins.length;

    const byStatus = EMPLOYMENT_STATUS_OPTIONS.map(option => ({
      status: option.label,
      value: employees.filter(item => item.employment_status === option.value).length
    })).filter(item => item.value > 0);

    return { total, active, probation, admins: adminCount, byStatus };
  }, [admins, employees]);

  // ============================================================
  // Department Loading
  // ============================================================

  const loadDepartments = useCallback(async () => {
    if (!user) {
      setDepartments([]);
      return;
    }
    try {
      setLoadingDepartments(true);
      const data = await getDepartments();
      // Enrich with employee count
      const enriched = data.map((dept) => ({
        ...dept,
        employee_count: users.filter((u) => u.department_id === dept.department_id).length
      }));
      setDepartments(enriched);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDepartments(false);
    }
  }, [user, users]);

  useEffect(() => {
    loadDepartments().catch(console.error);
  }, [loadDepartments]);

  // Department lookup map
  const departmentLookup = useMemo(() => {
    const map = new Map<string, ApiDepartment>();
    departments.forEach((dept) => {
      map.set(normalizeDepartmentKey(dept.name), dept);
    });
    return map;
  }, [departments]);

  // Allowed department options based on user role
  const allowedDepartmentOptions: DepartmentOption[] = useMemo(() => {
    if (isAdmin) return departments;
    if (isDepartmentHead && departmentKey) {
      return departments.filter((dept) => normalizeDepartmentKey(dept.name) === departmentKey);
    }
    if (departmentKey) {
      return departments.filter((dept) => normalizeDepartmentKey(dept.name) === departmentKey);
    }
    return [];
  }, [departments, departmentKey, isAdmin, isDepartmentHead]);

  // Department role usage tracking
  const departmentRoleUsage = useMemo(() => {
    const usage = new Map<string, Map<string, number[]>>();
    users.forEach((item) => {
      if (!item.department || !item.department_position) return;
      const deptKey = normalizeDepartmentKey(item.department);
      if (!deptKey) return;
      const roleKey = normalizeDepartmentKey(item.department_position);
      if (!roleKey) return;
      if (!usage.has(deptKey)) usage.set(deptKey, new Map());
      const roleMap = usage.get(deptKey)!;
      if (!roleMap.has(roleKey)) roleMap.set(roleKey, []);
      const occupantIds = roleMap.get(roleKey)!;
      const numericId = typeof item.user_id === "number" ? item.user_id : Number(item.user_id);
      if (!Number.isNaN(numericId)) {
        occupantIds.push(numericId);
      }
    });
    return usage;
  }, [users]);

  // Department role summary with occupant counts
  const departmentRoleSummary: Record<string, DepartmentRoleSummaryItem[]> = useMemo(() => {
    const summary: Record<string, DepartmentRoleSummaryItem[]> = {};

    departments.forEach((dept) => {
      const deptKey = normalizeDepartmentKey(dept.name);
      if (!deptKey) return;
      const descriptionRoles = parseDepartmentDescription(dept.description);
      if (!descriptionRoles.length) {
        summary[deptKey] = [];
        return;
      }

      const usage = departmentRoleUsage.get(deptKey);
      const roles: DepartmentRoleSummaryItem[] = [];

      descriptionRoles.forEach((role) => {
        const total = Number(role.quantity);
        const normalizedTitle = normalizeDepartmentKey(role.title);
        if (!role.title.trim() || Number.isNaN(total) || total <= 0 || !normalizedTitle) return;

        const occupantIds = usage?.get(normalizedTitle) ?? [];
        const uniqueOccupants = Array.from(new Set(occupantIds)).filter(
          (id): id is number => typeof id === "number" && Number.isFinite(id)
        );

        roles.push({
          title: role.title,
          total,
          occupantIds: uniqueOccupants
        });
      });

      summary[deptKey] = roles;
    });

    return summary;
  }, [departments, departmentRoleUsage]);

  // ============================================================
  // Department Adjustments
  // ============================================================

  const applyDepartmentAdjustments = useCallback(
    (
      list: ApiUser[],
      nameAliasOverrides?: Record<string, string>,
      roleAliasOverrides?: Record<string, Record<string, string>>
    ) => {
      const mergedNameAliases = nameAliasOverrides
        ? { ...departmentNameAliases, ...nameAliasOverrides }
        : departmentNameAliases;

      const mergedRoleAliases = roleAliasOverrides
        ? Object.entries(roleAliasOverrides).reduce<Record<string, Record<string, string>>>(
            (acc, [deptKey, aliases]) => {
              acc[deptKey] = { ...(acc[deptKey] ?? {}), ...aliases };
              return acc;
            },
            { ...departmentRoleAliases }
          )
        : departmentRoleAliases;

      return list.map((item) => {
        if (!item.department) return item;
        const deptKey = normalizeDepartmentKey(item.department);
        let next: ApiUser | null = null;

        const roleAliasMap = mergedRoleAliases[deptKey];
        if (roleAliasMap && item.department_position) {
          const roleKey = normalizeDepartmentKey(item.department_position);
          const replacement = roleAliasMap[roleKey];
          if (replacement && replacement !== item.department_position) {
            next = { ...(next ?? item), department_position: replacement };
          }
        }

        const nameReplacement = mergedNameAliases[deptKey];
        if (nameReplacement && nameReplacement !== (next?.department ?? item.department)) {
          next = { ...(next ?? item), department: nameReplacement };
        }

        return next ?? item;
      });
    },
    [departmentNameAliases, departmentRoleAliases]
  );

  // ============================================================
  // User Loading
  // ============================================================

  const reloadUsers = useCallback(
    async (overrides?: {
      nameAliases?: Record<string, string>;
      roleAliases?: Record<string, Record<string, string>>;
    }) => {
      const data = await getUsers();
      const normalized = data.map(normalizeUserRecord);
      if (user && !normalized.some((item) => String(item.user_id) === String(user.user_id))) {
        logout({ reason: "removed" });
        return;
      }
      const adjusted = applyDepartmentAdjustments(
        normalized,
        overrides?.nameAliases,
        overrides?.roleAliases
      );
      setUsers(adjusted);
    },
    [applyDepartmentAdjustments, logout, user]
  );

  useEffect(() => {
    let mounted = true;
    const loadInitialUsers = async () => {
      setLoading(true);
      try {
        await reloadUsers();
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialUsers().catch(console.error);

    return () => {
      mounted = false;
    };
  }, [reloadUsers]);

  // ============================================================
  // Message Handling
  // ============================================================

  useEffect(() => {
    if (!message) return;
    setMessageVisible(true);
    const hideTimer = window.setTimeout(() => {
      setMessageVisible(false);
    }, 4200);
    const removeTimer = window.setTimeout(() => {
      setMessage(null);
    }, 4700);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, [message]);

  const dismissMessage = useCallback(() => {
    setMessageVisible(false);
    window.setTimeout(() => setMessage(null), 250);
  }, []);

  // ============================================================
  // Permission Checks
  // ============================================================

  const canEditRecord = useCallback(
    (item: ApiUser): boolean => {
      if (!user) return false;
      if (isAdmin) return true;
      if (String(item.user_id) === String(user.user_id)) return true;
      if (!isDepartmentHead) return false;
      if (!departmentKey) return false;
      const targetKey = normalizeDepartmentKey(item.department ?? null);
      return targetKey === departmentKey;
    },
    [departmentKey, isAdmin, isDepartmentHead, user]
  );

  const canDeleteAccount = useCallback(
    (item: ApiUser): boolean => {
      if (!user || !isAdmin) return false;
      if (String(item.user_id) === String(user.user_id)) return false;
      if (item.user_id === SUPER_ADMIN_ID) return false;
      if (item.employment_status !== "resigned") return false;
      if (!item.updated_at) return false;
      const updatedAt = new Date(item.updated_at);
      if (Number.isNaN(updatedAt.getTime())) return false;
      return Date.now() - updatedAt.getTime() >= THIRTY_DAYS_MS;
    },
    [isAdmin, user]
  );

  // ============================================================
  // CRUD Handlers
  // ============================================================
  
  // Upload CV handler
  const handleUploadCv = async (target: ApiUser, file: File): Promise<ApiUser | void> => {
    try {
      setSubmitting(true);
      const { uploadCv } = await import('../../../../api/users');
      const res = await uploadCv(target.user_id, file);
      const normalized = normalizeUserRecord(res.user);
      const adjusted = applyDepartmentAdjustments([normalized])[0];
      setUsers((prev) => prev.map((u) => (u.user_id === adjusted.user_id ? adjusted : u)));
      setMessage({ type: 'success', text: 'Đã tải lên CV' });
      // Return updated user so callers (modal) can refresh selectedUser
      return adjusted;
    } catch (err) {
      const msg = resolveErrorMessage(err, 'Không thể tải CV lên');
      setMessage({ type: 'error', text: msg });
      return undefined;
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadAvatar = async (target: ApiUser, file: File): Promise<ApiUser | void> => {
    try {
      setSubmitting(true);
      const { uploadAvatar } = await import('../../../../api/users');
      const res = await uploadAvatar(target.user_id, file);
      const normalized = normalizeUserRecord(res.user);
      const adjusted = applyDepartmentAdjustments([normalized])[0];
      setUsers((prev) => prev.map((u) => (u.user_id === adjusted.user_id ? adjusted : u)));
      setMessage({ type: 'success', text: 'Đã tải lên ảnh đại diện' });
      return adjusted;
    } catch (err) {
      const msg = resolveErrorMessage(err, 'Không thể tải ảnh đại diện lên');
      setMessage({ type: 'error', text: msg });
      return undefined;
    } finally {
      setSubmitting(false);
    }
  };


  const handleCreate = async (values: FormState) => {
    setSubmitting(true);
    try {
      const payload = buildPayload(values, "create") as CreateUserPayload;
      if (payload.department) {
        const matchedDepartment = departmentLookup.get(normalizeDepartmentKey(payload.department));
        if (!matchedDepartment) {
          const error = new Error(
            "Phòng ban không hợp lệ hoặc đã bị thay đổi. Vui lòng tải lại danh sách phòng ban."
          );
          setMessage({ type: "error", text: error.message });
          throw error;
        }
        payload.department_id = matchedDepartment.department_id;
        payload.department = matchedDepartment.name;
      }
      const { user: created, defaultPassword } = await createUser(payload);
      const normalized = normalizeUserRecord(created);
      const adjusted = applyDepartmentAdjustments([normalized])[0];
      setUsers((prev) => [adjusted, ...prev]);
      const descriptor = normalized.role === "admin" ? "tài khoản quản trị" : "nhân viên";
      const passwordNote = defaultPassword ? ` · Mật khẩu mặc định: ${defaultPassword}` : "";
      setMessage({ type: "success", text: `Đã tạo ${descriptor}${passwordNote}` });
      setShowCreateModal(false);
      void reloadUsers();
    } catch (err) {
      const msg = resolveErrorMessage(err, "Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin nhập.");
      setMessage({ type: "error", text: msg });
      throw new Error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values: FormState) => {
    if (!targetUser) return;
    setSubmitting(true);
    try {
      const payload = buildPayload(values, "update") as UpdateUserPayload;
      if (payload.department) {
        const matchedDepartment = departmentLookup.get(normalizeDepartmentKey(payload.department));
        if (!matchedDepartment) {
          const error = new Error(
            "Phòng ban không hợp lệ hoặc đã bị thay đổi. Vui lòng tải lại danh sách phòng ban."
          );
          setMessage({ type: "error", text: error.message });
          throw error;
        }
        payload.department_id = matchedDepartment.department_id;
        payload.department = matchedDepartment.name;
      }
      const { user: updated } = await updateUser(targetUser.user_id, payload);
      const normalized = normalizeUserRecord(updated);
      const adjusted = applyDepartmentAdjustments([normalized])[0];
      setUsers((prev) =>
        prev.map((item) => (item.user_id === adjusted.user_id ? adjusted : item))
      );
      const descriptor = normalized.role === "admin" ? "tài khoản quản trị" : "nhân viên";
      setMessage({ type: "success", text: `Đã cập nhật ${descriptor}` });
      setShowEditModal(false);
      void reloadUsers();
    } catch (err) {
      const msg = resolveErrorMessage(
        err,
        "Không thể cập nhật tài khoản. Vui lòng kiểm tra thông tin và thử lại."
      );
      setMessage({ type: "error", text: msg });
      throw new Error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!targetUser) return;
    setSubmitting(true);
    try {
      const descriptor = targetUser.role === "admin" ? "tài khoản quản trị" : "nhân viên";
      await deleteUser(targetUser.user_id);
      setUsers((prev) => prev.filter((item) => item.user_id !== targetUser.user_id));
      setMessage({ type: "success", text: `Đã xóa ${descriptor}` });
      setShowDeleteDialog(false);
      setTargetUser(null);
      void reloadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể xóa tài khoản";
      setMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // Department CRUD Handlers
  // ============================================================

  const handleDepartmentModalSubmit = async (
    values: DepartmentModalValues,
    departmentId?: number
  ) => {
    const trimmedName = values.name.trim();
    const trimmedRoles = values.roles.map((role) => ({
      title: role.title.trim(),
      quantity: role.quantity.trim()
    }));
    const filteredRoles = trimmedRoles.filter((role) => role.title);

    if (!trimmedName) {
      const error = new Error("Vui lòng nhập tên phòng ban");
      setMessage({ type: "error", text: error.message });
      throw error;
    }

    if (!filteredRoles.length) {
      const error = new Error("Vui lòng nhập ít nhất một chức vụ");
      setMessage({ type: "error", text: error.message });
      throw error;
    }

    const normalizedRoles = filteredRoles.map((role) => {
      const roleKey = normalizeDepartmentKey(role.title);
      if (roleKey === MANAGER_ROLE_KEY) {
        return { title: MANAGER_ROLE_TITLE, quantity: MANAGER_ROLE_QUANTITY };
      }
      return { title: role.title, quantity: role.quantity || "" };
    });

    const managerNormalized = normalizedRoles.filter(
      (role) => normalizeDepartmentKey(role.title) !== MANAGER_ROLE_KEY
    );
    const finalRoles: DepartmentRoleRow[] = [
      { title: MANAGER_ROLE_TITLE, quantity: MANAGER_ROLE_QUANTITY },
      ...managerNormalized
    ];

    const description = finalRoles
      .map((role) => (role.quantity ? `${role.title} · ${role.quantity}` : role.title))
      .join("\n");

    try {
      setDepartmentModalSubmitting(true);
      const resolvedDepartmentId =
        typeof departmentId === "number" && Number.isFinite(departmentId) ? departmentId : undefined;
      let pendingNameAliases: Record<string, string> | undefined;
      let pendingRoleAliases: Record<string, Record<string, string>> | undefined;

      if (resolvedDepartmentId != null) {
        const previousDepartment = departments.find(
          (dept) => dept.department_id === resolvedDepartmentId
        );
        const previousDeptName = previousDepartment?.name ?? trimmedName;
        const previousDeptKey = normalizeDepartmentKey(previousDeptName);
        const previousRoles = previousDepartment
          ? parseDepartmentDescription(previousDepartment.description)
          : [];
        const indexToRoleKey: Record<number, string> = {};
        previousRoles.forEach((role, index) => {
          const key = normalizeDepartmentKey(role.title);
          if (key) {
            indexToRoleKey[index] = key;
          }
        });

        const baseRoleAliases: Record<string, string> = {};
        finalRoles.forEach((role, index) => {
          const key = normalizeDepartmentKey(role.title);
          if (key) {
            baseRoleAliases[key] = role.title;
          }
          const previousKey = indexToRoleKey[index];
          if (previousKey) {
            baseRoleAliases[previousKey] = role.title;
          }
        });

        const { department } = await updateDepartment(resolvedDepartmentId, {
          name: trimmedName,
          description: description || undefined
        });
        const nextDeptName = department.name;
        const nextDeptKey = normalizeDepartmentKey(nextDeptName);

        setDepartments((prev) => {
          const next = prev.some((item) => item.department_id === department.department_id)
            ? prev.map((item) =>
                item.department_id === department.department_id ? department : item
              )
            : [...prev, department];
          return sortDepartments(next);
        });

        if (previousDeptKey) {
          setUsers((prev) =>
            prev.map((item) => {
              if (!item.department) return item;
              const itemDeptKey = normalizeDepartmentKey(item.department);
              if (itemDeptKey !== previousDeptKey) return item;

              const nextItem: ApiUser = { ...item, department: nextDeptName };
              if (item.department_position) {
                const roleKey = normalizeDepartmentKey(item.department_position);
                const replacement = baseRoleAliases[roleKey];
                if (replacement) {
                  nextItem.department_position = replacement;
                }
              }
              return nextItem;
            })
          );
        }

        pendingNameAliases = {};
        if (previousDeptKey) {
          pendingNameAliases[previousDeptKey] = nextDeptName;
        }
        if (nextDeptKey) {
          pendingNameAliases[nextDeptKey] = nextDeptName;
        }

        pendingRoleAliases = {};
        if (previousDeptKey) {
          pendingRoleAliases[previousDeptKey] = { ...baseRoleAliases };
        }
        if (nextDeptKey) {
          pendingRoleAliases[nextDeptKey] = {
            ...(pendingRoleAliases[nextDeptKey] ?? {}),
            ...baseRoleAliases
          };
        }

        if (pendingNameAliases && Object.keys(pendingNameAliases).length) {
          setDepartmentNameAliases((prev) => ({ ...prev, ...pendingNameAliases }));
        }
        const roleAliasesToPersist = pendingRoleAliases;
        if (roleAliasesToPersist && Object.keys(roleAliasesToPersist).length) {
          setDepartmentRoleAliases((prev) => {
            const next = { ...prev };
            Object.entries(roleAliasesToPersist).forEach(([deptKey, aliases]) => {
              next[deptKey] = { ...(next[deptKey] ?? {}), ...aliases };
            });
            return next;
          });
        }

        setMessage({ type: "success", text: "Đã cập nhật phòng ban" });
      } else {
        const { department } = await createDepartment({
          name: trimmedName,
          description: description || undefined
        });
        setDepartments((prev) => sortDepartments([...prev, department]));
        setMessage({ type: "success", text: "Đã tạo phòng ban mới" });
      }

      setDepartmentModalOpen(false);
      const reloadOverrides =
        resolvedDepartmentId != null
          ? { nameAliases: pendingNameAliases, roleAliases: pendingRoleAliases }
          : undefined;
      await reloadUsers(reloadOverrides).catch(console.error);
      await loadDepartments();
    } catch (error) {
      const msg = resolveErrorMessage(
        error,
        "Không thể lưu phòng ban. Vui lòng kiểm tra tên, chức vụ và số lượng."
      );
      setMessage({ type: "error", text: msg });
      throw error instanceof Error ? error : new Error(msg);
    } finally {
      setDepartmentModalSubmitting(false);
    }
  };

  const handleDepartmentDelete = useCallback(
    async (departmentId: number) => {
      try {
        setDepartmentModalSubmitting(true);
        const targetDepartment =
          departments.find((dept) => dept.department_id === departmentId) ?? null;
        await deleteDepartment(departmentId);
        setDepartments((prev) => prev.filter((item) => item.department_id !== departmentId));

        const normalizedKey = normalizeDepartmentKey(targetDepartment?.name ?? null);
        if (normalizedKey) {
          setDepartmentNameAliases((prev) => {
            if (!Object.keys(prev).length) return prev;
            const next = { ...prev };
            delete next[normalizedKey];
            Object.keys(next).forEach((aliasKey) => {
              if (normalizeDepartmentKey(next[aliasKey]) === normalizedKey) {
                delete next[aliasKey];
              }
            });
            return next;
          });

          setDepartmentRoleAliases((prev) => {
            if (!Object.keys(prev).length) return prev;
            const next = { ...prev };
            delete next[normalizedKey];
            return next;
          });
        }

        const successDescriptor = targetDepartment?.name
          ? `Đã xóa phòng ban ${targetDepartment.name}`
          : "Đã xóa phòng ban";
        setMessage({ type: "success", text: successDescriptor });
        await reloadUsers().catch(console.error);
        await loadDepartments();
      } catch (error) {
        const msg = resolveErrorMessage(
          error,
          "Không thể xóa phòng ban vì vẫn còn dữ liệu liên kết (nhân sự, KPI...)."
        );
        setMessage({ type: "error", text: msg });
        throw error instanceof Error ? error : new Error(msg);
      } finally {
        setDepartmentModalSubmitting(false);
      }
    },
    [departments, loadDepartments, reloadUsers]
  );

  // ============================================================
  // Modal Openers
  // ============================================================

  const openCreateUserModal = useCallback(() => {
    setTargetUser(null);
    setCreateTitle("Thêm nhân viên mới");
    setCreateInitialValues({ ...EMPTY_FORM });
    setShowCreateModal(true);
  }, []);

  const openCreateAdminModal = useCallback(() => {
    setTargetUser(null);
    setCreateTitle("Thêm quản trị viên");
    setCreateInitialValues({ ...ADMIN_FORM });
    setShowCreateModal(true);
  }, []);

  const openEditModal = useCallback((userToEdit: ApiUser) => {
    setTargetUser(userToEdit);
    setShowEditModal(true);
  }, []);

  const openDeleteDialog = useCallback((userToDelete: ApiUser) => {
    setTargetUser(userToDelete);
    setShowDeleteDialog(true);
  }, []);

  const openDepartmentModal = useCallback(() => {
    void loadDepartments();
    setDepartmentModalOpen(true);
  }, [loadDepartments]);

  const closeCreateModal = useCallback(() => setShowCreateModal(false), []);
  const closeEditModal = useCallback(() => setShowEditModal(false), []);
  const closeDeleteDialog = useCallback(() => {
    setShowDeleteDialog(false);
    setTargetUser(null);
  }, []);
  const closeDepartmentModal = useCallback(() => setDepartmentModalOpen(false), []);

  return {
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
    departmentKey,
    showManagementTools,
    selfOnlyView,
    roleFilter,
    setRoleFilter,

    // Permission checks
    canEditRecord,
    canDeleteAccount,

    // CRUD handlers
    handleCreate,
    handleUpdate,
    handleDelete,
    handleUploadCv,
    handleUploadAvatar,
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
  };
}
