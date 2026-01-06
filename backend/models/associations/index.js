/**
 * Model Associations
 * Centralized location for all Sequelize model relationships
 */

const setupAssociations = (models) => {
  const {
    User,
    Department,
    ProductionChain,
    ProductionChainStep,
    ProductionChainFeedback,
    ChainKpi,
    KpiCompletion,
    Timesheet,
    Notification,
    ProfileUpdateRequest
  } = models;

  // ============================================
  // User & Department
  // ============================================
  Department.hasMany(User, { foreignKey: 'department_id', as: 'members' });
  User.belongsTo(Department, { foreignKey: 'department_id', as: 'departmentRef' });

  Department.belongsTo(User, { 
    foreignKey: { name: 'manager_user_id', allowNull: true, constraints: false },
    as: 'manager'
  });
  User.hasMany(Department, { 
    foreignKey: { name: 'manager_user_id', allowNull: true, constraints: false },
    as: 'managedDepartments'
  });

  // ============================================
  // Timesheet & Leave
  // ============================================
  User.hasMany(Timesheet, { foreignKey: 'user_id' });
  Timesheet.belongsTo(User, { foreignKey: 'user_id' });

  // ============================================
  // Profile & Notifications
  // ============================================
  User.hasMany(ProfileUpdateRequest, { foreignKey: 'user_id', as: 'profileUpdateRequests' });
  ProfileUpdateRequest.belongsTo(User, { foreignKey: 'user_id', as: 'requester' });
  ProfileUpdateRequest.belongsTo(User, { foreignKey: 'admin_id', as: 'reviewer' });

  Notification.belongsTo(User, { foreignKey: 'recipient_user_id', as: 'recipient' });

  // ============================================
  // Production Chains
  // ============================================
  User.hasMany(ProductionChain, { foreignKey: 'created_by' });
  ProductionChain.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

  ProductionChain.hasMany(ProductionChainStep, { foreignKey: 'chain_id', as: 'steps' });
  ProductionChainStep.belongsTo(ProductionChain, { foreignKey: 'chain_id', as: 'chain' });

  Department.hasMany(ProductionChainStep, { foreignKey: 'department_id' });
  ProductionChainStep.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

  ProductionChain.hasMany(ChainKpi, { foreignKey: 'chain_id', as: 'kpis' });
  ChainKpi.belongsTo(ProductionChain, { foreignKey: 'chain_id', as: 'chain' });

  ChainKpi.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  User.hasMany(ChainKpi, { foreignKey: 'created_by' });

  ChainKpi.hasMany(KpiCompletion, { foreignKey: 'chain_kpi_id', as: 'completions' });
  KpiCompletion.belongsTo(ChainKpi, { foreignKey: 'chain_kpi_id', as: 'kpi' });

  // Assignments
  if (models.ChainKpiAssignment) {
    ChainKpi.hasMany(models.ChainKpiAssignment, { foreignKey: 'chain_kpi_id', as: 'assignments' });
    models.ChainKpiAssignment.belongsTo(ChainKpi, { foreignKey: 'chain_kpi_id', as: 'kpi' });
    models.ChainKpiAssignment.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
    User.hasMany(models.ChainKpiAssignment, { foreignKey: 'assigned_to' });
  }

  KpiCompletion.belongsTo(User, { foreignKey: 'completed_by', as: 'completedBy' });
  User.hasMany(KpiCompletion, { foreignKey: 'completed_by' });

  // Production Chain Feedback
  ProductionChainFeedback.belongsTo(KpiCompletion, { foreignKey: 'assignment_id', as: 'assignment' });
  KpiCompletion.hasMany(ProductionChainFeedback, { foreignKey: 'assignment_id', as: 'feedbacks' });

  ProductionChainFeedback.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
  User.hasMany(ProductionChainFeedback, { foreignKey: 'user_id', as: 'feedbacks' });

};

module.exports = setupAssociations;
