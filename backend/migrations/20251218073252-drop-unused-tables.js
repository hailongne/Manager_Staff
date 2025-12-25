'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Drop unused tables in correct order (child tables first due to foreign keys)
    const tablesToDrop = [
      'workflow_task_events',
      'workflow_task_attachments',
      'workflow_task_assignments',
      'workflow_tasks',
      'department_workflow_steps',
      'department_chain_assignment_feedbacks',
      'department_chain_assignments',
      'department_chain_kpis',
      'department_chains',
      'chain_assignment_feedbacks',
      'chain_assignments',
      'chain_kpis',
      'kpi_cycles',
      'department_workflows',
      'leave_balances',
      'leave_requests',
      'salaries'
    ];

    for (const tableName of tablesToDrop) {
      await queryInterface.dropTable(tableName);
    }
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
