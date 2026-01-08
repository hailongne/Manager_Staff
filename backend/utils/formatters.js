/**
 * Response Formatter Utilities
 * Shape database records for API responses
 */

/**
 * Get plain object from Sequelize instance
 */
const toPlain = (instance) => {
  if (!instance) return null;
  return instance.get ? instance.get({ plain: true }) : instance;
};

/**
 * Shape user response (basic info)
 */
const shapeUser = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    user_id: plain.user_id,
    name: plain.name,
    email: plain.email,
    username: plain.username,
    role: plain.role,
    phone: plain.phone,
    avatar_url: plain.avatar_url ?? null,
    cv_url: plain.cv_url ?? null,
    department_id: plain.department_id,
    department: plain.department,
    department_position: plain.department_position,
    address: plain.address,
    date_joined: plain.date_joined,
    employment_status: plain.employment_status,
    official_confirmed_at: plain.official_confirmed_at 
      ? new Date(plain.official_confirmed_at).toISOString() 
      : null,
    annual_leave_quota: plain.annual_leave_quota != null 
      ? Number(plain.annual_leave_quota) 
      : null,
    remaining_leave_days: plain.remaining_leave_days != null 
      ? Number(plain.remaining_leave_days) 
      : null,
    work_shift_start: plain.work_shift_start,
    work_shift_end: plain.work_shift_end,
    note: plain.note,
    created_at: plain.created_at,
    updated_at: plain.updated_at
  };
};

/**
 * Shape user summary (minimal info)
 */
const shapeUserSummary = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    user_id: plain.user_id,
    name: plain.name,
    email: plain.email,
    department: plain.department
  };
};

/**
 * Shape department response
 */
const shapeDepartment = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    department_id: plain.department_id,
    name: plain.name,
    description: plain.description,
    manager_user_id: plain.manager_user_id,
    manager: plain.manager ? shapeUserSummary(plain.manager) : null,
    member_count: plain.members?.length ?? 0,
    created_at: plain.created_at,
    updated_at: plain.updated_at
  };
};

/**
 * Shape task response
 */
const shapeTask = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    task_id: plain.task_id,
    title: plain.title,
    description: plain.description,
    date: plain.date,
    count_total: plain.count_total,
    count_actual: plain.count_actual,
    status: plain.status,
    user_id: plain.user_id,
    user: plain.User ? shapeUserSummary(plain.User) : null,
    created_at: plain.created_at,
    updated_at: plain.updated_at
  };
};

/**
 * Shape department chain response
 */
const shapeChain = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    chain_id: plain.chain_id,
    product_name: plain.product_name,
    department_ids: Array.isArray(plain.department_ids) ? plain.department_ids : [],
    created_at: plain.created_at,
    updated_at: plain.updated_at
  };
};

/**
 * Shape chain KPI response
 */
const shapeChainKpi = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    chain_kpi_id: plain.chain_kpi_id,
    chain_id: plain.chain_id,
    month: plain.month,
    year: plain.year,
    target_value: plain.target_value,
    unit_label: plain.unit_label,
    week_breakdown: Array.isArray(plain.week_breakdown) ? plain.week_breakdown : [],
    notes: plain.notes,
    status: plain.status,
    confirmed_by: plain.confirmed_by,
    confirmed_at: plain.confirmed_at,
    created_by: plain.created_by,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    creator: plain.creator ? shapeUserSummary(plain.creator) : null
  };
};

/**
 * Shape chain assignment response
 */
const shapeChainAssignment = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    assignment_id: plain.assignment_id,
    chain_id: plain.chain_id,
    kpi_id: plain.kpi_id,
    month: plain.month,
    year: plain.year,
    title: plain.title,
    description: plain.description,
    quantity: plain.quantity,
    unit_label: plain.unit_label,
    topic: plain.topic,
    contents: plain.contents,
    distribution: plain.distribution,
    week_index: plain.week_index,
    due_date: plain.due_date,
    status: plain.status,
    confirmed_by: plain.confirmed_by,
    confirmed_at: plain.confirmed_at,
    created_by: plain.created_by,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    creator: plain.creator ? shapeUserSummary(plain.creator) : null,
    kpi: plain.kpi ? shapeChainKpi(plain.kpi) : null,
    chain: plain.chain ? shapeChain(plain.chain) : null
  };
};

/**
 * Shape chain feedback response
 */
const shapeChainFeedback = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    feedback_id: plain.feedback_id,
    assignment_id: plain.assignment_id,
    user_id: plain.user_id,
    message: plain.message,
    status: plain.status,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    author: plain.author ? shapeUserSummary(plain.author) : null
  };
};

/**
 * Shape leave request response
 */
const shapeLeaveRequest = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    leave_request_id: plain.leave_request_id,
    user_id: plain.user_id,
    leave_type: plain.leave_type,
    start_date: plain.start_date,
    end_date: plain.end_date,
    reason: plain.reason,
    status: plain.status,
    days_requested: plain.days_requested,
    admin_note: plain.admin_note,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    user: plain.User ? shapeUserSummary(plain.User) : null
  };
};

/**
 * Shape notification response
 */
const shapeNotification = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    notification_id: plain.notification_id,
    recipient_user_id: plain.recipient_user_id,
    title: plain.title,
    message: plain.message,
    type: plain.type,
    is_read: plain.is_read,
    created_at: plain.created_at
  };
};

/**
 * Shape habit response
 */
const shapeHabit = (instance) => {
  const plain = toPlain(instance);
  if (!plain) return null;
  
  return {
    habit_id: plain.habit_id,
    user_id: plain.user_id,
    title: plain.title,
    frequency: plain.frequency,
    target_count: plain.target_count,
    status: plain.status,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    user: plain.User ? shapeUserSummary(plain.User) : null
  };
};

/**
 * Create paginated response
 */
const paginatedResponse = ({ data, total, page, limit }) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  }
});

/**
 * Create success response
 */
const successResponse = (data, message = 'Success') => ({
  success: true,
  message,
  data
});

/**
 * Create error response
 */
const errorResponse = (message, errors = null) => ({
  success: false,
  message,
  errors
});

module.exports = {
  toPlain,
  shapeUser,
  shapeUserSummary,
  shapeDepartment,
  shapeTask,
  shapeChain,
  shapeChainKpi,
  shapeChainAssignment,
  shapeChainFeedback,
  shapeLeaveRequest,
  shapeNotification,
  shapeHabit,
  paginatedResponse,
  successResponse,
  errorResponse
};
