/**
 * Production Chain Controller
 * API for managing production chains and steps
 */

const { ProductionChain, ProductionChainStep, ChainKpi, KpiCompletion, Department, User, ChainKpiAssignment } = require('../models');
const { HTTP_STATUS } = require('../utils/constants');
const { Op } = require('sequelize');
const { calculateKpiDistribution } = require('../utils/kpiHelpers');
const { createAdminNotification, createUserNotification, createLeaderNotification } = require('../utils/notificationService');



// Helper functions for KPI completion logic
const createDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekIndex = (date) => {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
  return weekStart.getTime();
};

const getWorkingDaysInWeek = (kpi, weekIndex) => {
  if (!kpi.weeks) return [];

  const week = kpi.weeks.find(w => w.week_index === weekIndex);
  if (!week) return [];

  return week.days
    .filter(day => day.is_working_day)
    .map(day => day.date);
};

const collectNonZeroKpiDates = (kpi) => {
  if (!kpi.weeks || !Array.isArray(kpi.weeks)) return [];

  const dates = new Set();
  kpi.weeks.forEach(week => {
    if (!week || !Array.isArray(week.days)) return;
    week.days.forEach(day => {
      if (!day || !day.date) return;
      const value = Number(day.target_value || 0);
      if (value > 0) {
        dates.add(day.date);
      }
    });
  });

  return Array.from(dates);
};

const getActorLabel = (user = {}) => {
  if (!user) return 'Hệ thống';
  if (user.name) {
    if (user.role === 'admin') return `Admin ${user.name}`;
    if (user.role === 'leader') return `Leader ${user.name}`;
    return user.name;
  }
  return 'Hệ thống';
};

const uniqueIntegers = (values = []) => {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
};

const findLeadersByDepartmentIds = async (departmentIds = []) => {
  const ids = uniqueIntegers(departmentIds);
  if (!ids.length) return [];
  return User.findAll({
    where: { role: 'leader', department_id: ids },
    attributes: ['user_id', 'name', 'department', 'department_id']
  });
};

const notifyLeadersForDepartments = async (departmentIds = [], buildPayload) => {
  if (typeof buildPayload !== 'function') return;
  const leaders = await findLeadersByDepartmentIds(departmentIds);
  if (!leaders.length) return;
  await Promise.all(
    leaders.map((leader) => {
      const payload = buildPayload(leader) || {};
      return createLeaderNotification({
        ...payload,
        recipientUserId: leader.user_id || null
      });
    })
  );
};

const getWeekInfo = (kpi, weekIndex) => {
  if (!kpi || !Array.isArray(kpi.weeks)) return null;
  return kpi.weeks.find((week) => Number(week.week_index) === Number(weekIndex)) || null;
};

const getAssignmentDeadline = (assignment, fallbackWeek) => {
  const dayAssignments = assignment?.day_assignments || {};
  const days = Object.keys(dayAssignments).filter(Boolean).sort();
  if (days.length) {
    return days[days.length - 1];
  }
  if (fallbackWeek && fallbackWeek.end_date) {
    return fallbackWeek.end_date;
  }
  return null;
};

const refreshMonthlyAccumulationState = async (kpi) => {
  const nonZeroDates = collectNonZeroKpiDates(kpi);
  if (nonZeroDates.length === 0) {
    return;
  }

  const completedMonthDaysCount = await KpiCompletion.count({
    where: {
      chain_kpi_id: kpi.chain_kpi_id,
      completion_type: 'day',
      date_iso: nonZeroDates
    }
  });

  const monthFullyCompleted = completedMonthDaysCount === nonZeroDates.length;

  if (monthFullyCompleted && !kpi.is_accumulated) {
    const now = new Date();
    await kpi.update({ is_accumulated: true, accumulated_at: now });
    kpi.is_accumulated = true;
    kpi.accumulated_at = now;
  } else if (!monthFullyCompleted && kpi.is_accumulated) {
    await kpi.update({ is_accumulated: false, accumulated_at: null });
    kpi.is_accumulated = false;
    kpi.accumulated_at = null;
  }
};

/**
 * Create new production chain
 */
exports.createChain = async (req, res) => {
  try {
    const { name, description, steps } = req.body;
    const created_by = req.user.user_id;

    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ message: 'Tên và các bước là bắt buộc' });
    }

    // Validate steps
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.department_id || !step.title) {
        return res.status(400).json({ message: `Bước ${i + 1}: department_id và title là bắt buộc` });
      }

      // Check if department exists
      const dept = await Department.findByPk(step.department_id);
      if (!dept) {
        return res.status(400).json({ message: `Phòng ban ${step.department_id} không tồn tại` });
      }
    }

    // Validate minimum 2 different departments
    const uniqueDepartments = new Set(steps.map(step => step.department_id));
    if (uniqueDepartments.size < 2) {
      return res.status(400).json({ message: 'Chuỗi sản xuất phải có ít nhất 2 phòng ban khác nhau tham gia' });
    }

    // Validate step_order
    const stepOrders = steps.map(step => step.step_order).sort((a, b) => a - b);
    const expectedOrders = Array.from({ length: steps.length }, (_, i) => i + 1);
    if (!stepOrders.every((order, index) => order === expectedOrders[index])) {
      return res.status(400).json({ message: 'Thứ tự bước phải liên tiếp từ 1' });
    }

    // Create chain
    const chain = await ProductionChain.create({
      name,
      description,
      created_by
    });

    // Create steps
    const stepPromises = steps.map((step) =>
      ProductionChainStep.create({
        chain_id: chain.chain_id,
        step_order: step.step_order,
        department_id: step.department_id,
        title: step.title
        // description: step.description
      })
    );

    await Promise.all(stepPromises);

    const departmentIds = steps.map((step) => step.department_id).filter(Boolean);
    const actorLabel = getActorLabel(req.user);
    try {
      await notifyLeadersForDepartments(departmentIds, () => ({
        type: 'chain_kpi',
        title: 'Chuỗi sản xuất mới',
        message: `${actorLabel} vừa tạo chuỗi "${chain.name}" có liên quan tới phòng ban của bạn`,
        metadata: {
          chain_id: chain.chain_id,
          event: 'created',
          steps: steps.length
        },
        entityType: 'production_chain',
        entityId: chain.chain_id
      }));

      await createAdminNotification({
        type: 'chain_kpi',
        title: 'Chuỗi sản xuất mới',
        message: `${actorLabel} đã tạo chuỗi "${chain.name}" với ${steps.length} bước.`,
        metadata: {
          chain_id: chain.chain_id,
          event: 'created'
        },
        entityType: 'production_chain',
        entityId: chain.chain_id
      });
    } catch (notifyErr) {
      console.error('Không thể gửi thông báo tạo chuỗi', notifyErr);
    }

    res.status(201).json({
      message: 'Tạo chuỗi sản xuất thành công',
      chain: {
        ...chain.toJSON(),
        steps: await ProductionChainStep.findAll({
          where: { chain_id: chain.chain_id },
          include: [{ model: Department, as: 'department' }],
          order: [['step_order', 'ASC']]
        })
      }
    });
  } catch (err) {
    console.error('Create chain error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Update production chain
 */
exports.updateChain = async (req, res) => {
  try {
    const { chain_id } = req.params;
    const { name, description, steps } = req.body;

    const chain = await ProductionChain.findByPk(chain_id, {
      include: [{ model: ProductionChainStep, as: 'steps' }]
    });

    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    // Check if chain has any KPI completions
    const chainKpis = await ChainKpi.findAll({ where: { chain_id } });
    const kpiIds = chainKpis.map(k => k.chain_kpi_id);
    const hasCompletions = await KpiCompletion.findOne({
      where: { chain_kpi_id: kpiIds }
    });

    if (hasCompletions) {
      // Only allow updating basic info (name, description) and step titles/descriptions
      if (steps !== undefined) {
        // Check if only title/description are being updated
        const hasInvalidStepChanges = steps.some((step, index) => {
          const existingStep = chain.steps[index];
          return !existingStep || 
                 step.department_id !== existingStep.department_id || 
                 step.step_order !== existingStep.step_order;
        });
        
        if (hasInvalidStepChanges) {
          return res.status(400).json({ message: 'Không thể chỉnh sửa phòng ban hoặc thứ tự bước khi đã có dữ liệu hoàn thành' });
        }
      }

      await chain.update({ name, description });
      
      // Update step titles/descriptions if provided
      if (steps) {
        for (let i = 0; i < steps.length; i++) {
          const stepUpdate = steps[i];
          const existingStep = chain.steps[i];
          if (existingStep && (stepUpdate.title !== existingStep.title || stepUpdate.description !== existingStep.description)) {
            await existingStep.update({
              title: stepUpdate.title
              // description: stepUpdate.description
            });
          }
        }
      }
    } else {
      // Allow full update
      if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ message: 'Tên và các bước là bắt buộc' });
      }

      // Validate steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step.department_id || !step.title) {
          return res.status(400).json({ message: `Bước ${i + 1}: department_id và title là bắt buộc` });
        }

        // Check if department exists
        const dept = await Department.findByPk(step.department_id);
        if (!dept) {
          return res.status(400).json({ message: `Phòng ban ${step.department_id} không tồn tại` });
        }
      }

      // Validate minimum 2 different departments
      const uniqueDepartments = new Set(steps.map(step => step.department_id));
      if (uniqueDepartments.size < 2) {
        return res.status(400).json({ message: 'Chuỗi sản xuất phải có ít nhất 2 phòng ban khác nhau tham gia' });
      }

      // Validate step_order
      const stepOrders = steps.map(step => step.step_order).sort((a, b) => a - b);
      const expectedOrders = Array.from({ length: steps.length }, (_, i) => i + 1);
      if (!stepOrders.every((order, index) => order === expectedOrders[index])) {
        return res.status(400).json({ message: 'Thứ tự bước phải liên tiếp từ 1' });
      }

      // Update chain
      await chain.update({
        name,
        description
      });

      // Delete existing steps
      await ProductionChainStep.destroy({ where: { chain_id } });

      // Create new steps
      const stepPromises = steps.map((step) =>
        ProductionChainStep.create({
          chain_id,
          step_order: step.step_order,
          department_id: step.department_id,
          title: step.title
          // description: step.description
        })
      );

      await Promise.all(stepPromises);
    }

    res.json({
      message: 'Cập nhật chuỗi sản xuất thành công',
      chain: await ProductionChain.findByPk(chain_id, {
        include: [
          { model: User, as: 'creator' },
          {
            model: ProductionChainStep,
            as: 'steps',
            include: [{ model: Department, as: 'department' }],
            order: [['step_order', 'ASC']]
          }
        ]
      })
    });
  } catch (err) {
    console.error('Update chain error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Delete production chain
 */
exports.deleteChain = async (req, res) => {
  try {
    const { chain_id } = req.params;

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    // Check if chain has any KPI completions
    const chainKpis = await ChainKpi.findAll({ where: { chain_id } });
    const kpiIds = chainKpis.map(k => k.chain_kpi_id);
    const hasCompletions = await KpiCompletion.findOne({
      where: { chain_kpi_id: kpiIds }
    });

    if (hasCompletions) {
      return res.status(400).json({ message: 'Không thể xóa chuỗi đã có dữ liệu hoàn thành KPI' });
    }

    // Delete associated data
    await ProductionChainStep.destroy({ where: { chain_id } });
    await Task.destroy({ where: { chain_id } });
    await ChainKpi.destroy({ where: { chain_id } });

    await chain.destroy();

    res.json({ message: 'Xóa chuỗi sản xuất thành công' });
  } catch (err) {
    console.error('Delete chain error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Disable production chain (set status to inactive)
 */
exports.disableChain = async (req, res) => {
  try {
    const { chain_id } = req.params;

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    // Check if chain has any KPI completions
    const chainKpis = await ChainKpi.findAll({ where: { chain_id } });
    const kpiIds = chainKpis.map(k => k.chain_kpi_id);
    const hasCompletions = await KpiCompletion.findOne({
      where: { chain_kpi_id: kpiIds }
    });

    if (!hasCompletions) {
      return res.status(400).json({ message: 'Chỉ có thể vô hiệu hóa chuỗi đã có dữ liệu hoàn thành KPI' });
    }

    // Set status to inactive
    await chain.update({ status: 'inactive' });

    res.json({ message: 'Vô hiệu hóa chuỗi sản xuất thành công' });
  } catch (err) {
    console.error('Disable chain error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Enable production chain (set status back to active)
 */
exports.enableChain = async (req, res) => {
  try {
    const { chain_id } = req.params;

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    if (chain.status !== 'inactive') {
      return res.status(400).json({ message: 'Chỉ có thể kích hoạt lại chuỗi đã vô hiệu hóa' });
    }

    // Set status back to active
    await chain.update({ status: 'active' });

    res.json({ message: 'Kích hoạt lại chuỗi sản xuất thành công' });
  } catch (err) {
    console.error('Enable chain error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Get all production chains
 */
exports.getChains = async (req, res) => {
  try {
    const chains = await ProductionChain.findAll({
      where: { status: 'active' }, // Only show active chains
      include: [
        { model: User, as: 'creator' },
        {
          model: ProductionChainStep,
          as: 'steps',
          include: [{ model: Department, as: 'department' }],
          order: [['step_order', 'ASC']]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(chains);
  } catch (err) {
    console.error('Get chains error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Get all disabled production chains
 */
exports.getDisabledChains = async (req, res) => {
  try {
    const chains = await ProductionChain.findAll({
      where: { status: 'inactive' }, // Only show disabled chains
      include: [
        { model: User, as: 'creator' },
        {
          model: ProductionChainStep,
          as: 'steps',
          include: [{ model: Department, as: 'department' }],
          order: [['step_order', 'ASC']]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(chains);
  } catch (err) {
    console.error('Get disabled chains error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Start production chain (create first task)
 */
exports.startChain = async (req, res) => {
  try {
    const { chain_id } = req.params;
    const { title, description, date } = req.body;

    const chain = await ProductionChain.findByPk(chain_id, {
      include: [{ model: ProductionChainStep, as: 'steps', order: [['step_order', 'ASC']] }]
    });

    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    if (chain.steps.length === 0) {
      return res.status(400).json({ message: 'Chuỗi sản xuất không có bước nào' });
    }

    const firstStep = chain.steps[0];

    // Get a user from the department
    const departmentUser = await User.findOne({
      where: { department_id: firstStep.department_id },
      order: [['created_at', 'ASC']]
    });

    if (!departmentUser) {
      return res.status(400).json({ message: 'Phòng ban không có nhân viên' });
    }

    // Create first task
    const task = await Task.create({
      user_id: departmentUser.user_id,
      title: title || firstStep.title,
      description: description || firstStep.description,
      status: 'in_progress',
      date: date ? new Date(date) : new Date(),
      production_chain_id: chain_id,
      step_order: 1
    });

    res.json({
      message: 'Bắt đầu chuỗi sản xuất thành công',
      task
    });
  } catch (err) {
    console.error('Start chain error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Complete task and move to next step
 */
exports.completeTaskStep = async (req, res) => {
  try {
    const { task_id } = req.params;

    const task = await Task.findByPk(task_id, {
      include: [{ model: ProductionChain, as: 'productionChain', include: [{ model: ProductionChainStep, as: 'steps' }] }]
    });

    if (!task || !task.productionChain) {
      return res.status(404).json({ message: 'Task không tồn tại hoặc không thuộc chuỗi sản xuất' });
    }

    // Mark current task as completed
    await task.update({
      status: 'completed',
      completed_at: new Date()
    });

    const chain = task.productionChain;
    const currentStepOrder = task.step_order;
    const nextStep = chain.steps.find(s => s.step_order === currentStepOrder + 1);

    if (!nextStep) {
      // Chain completed
      return res.json({ message: 'Hoàn thành chuỗi sản xuất' });
    }

    // Create next task
    const nextDepartmentUser = await User.findOne({
      where: { department_id: nextStep.department_id },
      order: [['created_at', 'ASC']]
    });

    if (!nextDepartmentUser) {
      return res.status(400).json({ message: 'Phòng ban tiếp theo không có nhân viên' });
    }

    const nextTask = await Task.create({
      user_id: nextDepartmentUser.user_id,
      title: nextStep.title,
      description: nextStep.description,
      status: 'in_progress',
      date: new Date(),
      production_chain_id: chain.chain_id,
      step_order: nextStep.step_order
    });

    res.json({
      message: 'Chuyển sang bước tiếp theo',
      nextTask
    });
  } catch (err) {
    console.error('Complete task step error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Update production chain
 */
exports.updateChain = async (req, res) => {
  try {
    const { chain_id } = req.params;
    const { name, description, steps } = req.body;

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    // Update chain
    await chain.update({
      name: name || chain.name,
      description: description !== undefined ? description : chain.description
    });

    // Update steps if provided
    if (steps && Array.isArray(steps)) {
      // Delete existing steps
      await ProductionChainStep.destroy({ where: { chain_id } });

      // Create new steps
      const stepPromises = steps.map((step, index) =>
        ProductionChainStep.create({
          chain_id,
          step_order: index + 1,
          department_id: step.department_id,
          title: step.title,
          description: step.description
        })
      );
      await Promise.all(stepPromises);
    }

    res.json({
      message: 'Cập nhật chuỗi sản xuất thành công',
      chain: await ProductionChain.findByPk(chain_id, {
        include: [
          { model: User, as: 'creator' },
          {
            model: ProductionChainStep,
            include: [{ model: Department, as: 'department' }],
            order: [['step_order', 'ASC']]
          }
        ]
      })
    });
  } catch (err) {
    console.error('Update chain error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Delete production chain
 */
exports.deleteChain = async (req, res) => {
  try {
    const { chain_id } = req.params;

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    const chainName = chain.name;
    const chainSteps = await ProductionChainStep.findAll({
      where: { chain_id },
      attributes: ['department_id']
    });
    const departmentIds = chainSteps.map((step) => step.department_id).filter(Boolean);

    // Delete associated steps and tasks
    await ProductionChainStep.destroy({ where: { chain_id } });
    await Task.destroy({ where: { production_chain_id: chain_id } });

    // Delete chain
    await chain.destroy();

    const actorLabel = getActorLabel(req.user);
    try {
      await notifyLeadersForDepartments(departmentIds, () => ({
        type: 'chain_kpi',
        title: 'Chuỗi sản xuất bị gỡ',
        message: `${actorLabel} vừa xóa chuỗi "${chainName}" liên quan tới phòng ban của bạn`,
        metadata: {
          chain_id,
          event: 'deleted'
        },
        entityType: 'production_chain',
        entityId: Number(chain_id)
      }));

      await createAdminNotification({
        type: 'chain_kpi',
        title: 'Chuỗi sản xuất bị gỡ',
        message: `${actorLabel} đã xóa chuỗi "${chainName}".`,
        metadata: {
          chain_id,
          event: 'deleted'
        },
        entityType: 'production_chain',
        entityId: Number(chain_id)
      });
    } catch (notifyErr) {
      console.error('Không thể gửi thông báo xóa chuỗi', notifyErr);
    }

    res.json({ message: 'Xóa chuỗi sản xuất thành công' });
  } catch (err) {
    console.error('Delete chain error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Update production chain
 */
exports.updateChain = async (req, res) => {
  try {
    const { chain_id } = req.params;
    const { name, description, steps } = req.body;

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ message: 'Tên và các bước là bắt buộc' });
    }

    // Validate steps
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.department_id || !step.title) {
        return res.status(400).json({ message: `Bước ${i + 1}: department_id và title là bắt buộc` });
      }

      // Check if department exists
      const dept = await Department.findByPk(step.department_id);
      if (!dept) {
        return res.status(400).json({ message: `Phòng ban ${step.department_id} không tồn tại` });
      }
    }

    // Validate minimum 2 different departments
    const uniqueDepartments = new Set(steps.map(step => step.department_id));
    if (uniqueDepartments.size < 2) {
      return res.status(400).json({ message: 'Chuỗi sản xuất phải có ít nhất 2 phòng ban khác nhau tham gia' });
    }

    // Update chain
    await chain.update({
      name,
      description
    });

    // Delete existing steps
    await ProductionChainStep.destroy({ where: { chain_id } });

    // Create new steps
    const stepPromises = steps.map((step, index) =>
      ProductionChainStep.create({
        chain_id,
        step_order: index + 1,
        department_id: step.department_id,
        title: step.title,
        description: step.description
      })
    );

    await Promise.all(stepPromises);

    const actorLabel = getActorLabel(req.user);
    const departmentIds = steps.map((step) => step.department_id).filter(Boolean);
    try {
      await notifyLeadersForDepartments(departmentIds, () => ({
        type: 'chain_kpi',
        title: 'Chuỗi sản xuất được cập nhật',
        message: `${actorLabel} vừa chỉnh sửa chuỗi "${name}" có liên quan tới phòng ban của bạn`,
        metadata: {
          chain_id,
          event: 'updated',
          steps: steps.length
        },
        entityType: 'production_chain',
        entityId: Number(chain_id)
      }));

      await createAdminNotification({
        type: 'chain_kpi',
        title: 'Chuỗi sản xuất được cập nhật',
        message: `${actorLabel} đã cập nhật chuỗi "${name}".`,
        metadata: {
          chain_id,
          event: 'updated'
        },
        entityType: 'production_chain',
        entityId: Number(chain_id)
      });
    } catch (notifyErr) {
      console.error('Không thể gửi thông báo cập nhật chuỗi', notifyErr);
    }

    res.json({
      message: 'Cập nhật chuỗi sản xuất thành công',
      chain: {
        ...chain.toJSON(),
        steps: await ProductionChainStep.findAll({
          where: { chain_id },
          include: [{ model: Department, as: 'department' }],
          order: [['step_order', 'ASC']]
        })
      }
    });
  } catch (err) {
    console.error('Update chain error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Get KPIs for a production chain
 */
exports.getChainKpis = async (req, res) => {
  try {
    const { chain_id } = req.params;

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    const kpis = await ChainKpi.findAll({
      where: { chain_id },
      include: [
        { model: User, as: 'creator', attributes: ['user_id', 'name'] }
      ],
      order: [['start_date', 'DESC']]
    });

    // Calculate distribution for each KPI using its own dates
    const kpisWithDates = await Promise.all(kpis.map(async (kpi) => {
      const kpiData = kpi.toJSON();
      
      // Calculate KPI distribution if we have dates and no existing weeks
      if (kpiData.start_date && kpiData.end_date) {
        // If KPI already has weeks data, use it; otherwise calculate distribution
        if (!kpiData.weeks || kpiData.weeks.length === 0) {
          const startDateStr = kpiData.start_date.toISOString().split('T')[0];
          const endDateStr = kpiData.end_date.toISOString().split('T')[0];
          const distribution = calculateKpiDistribution(
            kpiData.target_value, 
            startDateStr, 
            endDateStr
          );
          kpiData.weeks = distribution.weeks;
        }

        // Get completions for this KPI
        const completions = await KpiCompletion.findAll({
          where: { chain_kpi_id: kpiData.chain_kpi_id },
          attributes: ['completion_type', 'week_index', 'date_iso']
        });

        // Mark completed days
        const completedDays = new Set();
        completions.forEach(completion => {
          if (completion.completion_type === 'day' && completion.date_iso) {
            completedDays.add(completion.date_iso);
          }
        });

        // Update weeks with completion status
        kpiData.weeks.forEach(week => {
          week.days.forEach(day => {
            day.is_completed = completedDays.has(day.date);
          });
        });
      }
      
      return kpiData;
    }));

    res.json(kpisWithDates);
  } catch (err) {
    console.error('Get chain KPIs error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Create KPI for a production chain
 */
exports.createChainKpi = async (req, res) => {
  try {
    const { chain_id } = req.params;
    const { target_value, start_date, end_date, unit_label, notes } = req.body;
    const created_by = req.user.user_id;

    if (target_value === undefined || !start_date || !end_date) {
      return res.status(400).json({ message: 'Mục tiêu KPI và khoảng thời gian là bắt buộc' });
    }

    if (target_value <= 0) {
      return res.status(400).json({ message: 'Mục tiêu KPI phải lớn hơn 0' });
    }

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    const kpi = await ChainKpi.create({
      chain_id,
      target_value,
      start_date,
      end_date,
      unit_label: unit_label || 'sản phẩm',
      notes,
      created_by
    });

    res.status(201).json({
      message: 'Tạo KPI thành công',
      kpi: await ChainKpi.findByPk(kpi.chain_kpi_id, {
        include: [{ model: User, as: 'creator', attributes: ['user_id', 'name'] }]
      })
    });
  } catch (err) {
    console.error('Create chain KPI error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Update KPI
 */
exports.updateChainKpi = async (req, res) => {
  try {
    const { kpi_id } = req.params;
    const { target_value, unit_label, notes } = req.body;

    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) {
      return res.status(404).json({ message: 'KPI không tồn tại' });
    }

    // Only check completions for unit_label and notes updates
    // Allow target_value updates even with completions (business logic allows changing total target)
    if ((unit_label !== undefined || notes !== undefined) && !target_value) {
      const hasCompletions = await KpiCompletion.findOne({
        where: { chain_kpi_id: kpi_id }
      });

      if (hasCompletions) {
        return res.status(400).json({ message: 'Không thể chỉnh sửa metadata KPI đã có dữ liệu hoàn thành' });
      }
    }

    if (target_value !== undefined && target_value <= 0) {
      return res.status(400).json({ message: 'Mục tiêu KPI phải lớn hơn 0' });
    }

    await kpi.update({
      target_value: target_value !== undefined ? target_value : kpi.target_value,
      unit_label: unit_label || kpi.unit_label,
      notes: notes !== undefined ? notes : kpi.notes
    });

    res.json({
      message: 'Cập nhật KPI thành công',
      kpi: await ChainKpi.findByPk(kpi_id, {
        include: [{ model: User, as: 'creator', attributes: ['user_id', 'name'] }]
      })
    });
  } catch (err) {
    console.error('Update chain KPI error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Update KPI weeks targets
 */
exports.updateKpiWeeks = async (req, res) => {
  try {
    const { kpi_id } = req.params;
    const { weeks } = req.body; // Array of { week_index, target_value, days: [...] }

    if (!Array.isArray(weeks)) {
      return res.status(400).json({ message: 'weeks phải là mảng' });
    }

    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) {
      return res.status(404).json({ message: 'KPI không tồn tại' });
    }

    // Load existing completions to preserve completed items
    const completions = await KpiCompletion.findAll({
      where: { chain_kpi_id: kpi_id },
      attributes: ['completion_type', 'week_index', 'date_iso']
    });

    // Create lookup maps for quick completion checks
    const completedWeeks = new Set(
      completions.filter(c => c.completion_type === 'week').map(c => c.week_index)
    );
    const completedDays = new Set(
      completions.filter(c => c.completion_type === 'day').map(c => c.date_iso)
    );

    // Validate weeks data
    for (const week of weeks) {
      if (!week.week_index || week.target_value === undefined || week.target_value < 0) {
        return res.status(400).json({ message: 'Dữ liệu tuần không hợp lệ' });
      }
    }

    // Update weeks in database
    const currentWeeks = kpi.weeks || [];
    
    // Merge completion status into current weeks
    const currentWeeksWithCompletion = currentWeeks.map(week => ({
      ...week,
      days: week.days.map(day => ({
        ...day,
        is_completed: completedDays.has(day.date)
      }))
    }));
    
    let updatedWeeks;
    if (currentWeeksWithCompletion.length === 0) {
      // If no existing weeks, use the incoming weeks data directly
      updatedWeeks = weeks.map(week => ({
        ...week,
        days: week.days || []
      }));
    } else {
      // Update existing weeks, preserving completed items
      updatedWeeks = currentWeeksWithCompletion.map(currentWeek => {
        const updateData = weeks.find(w => w.week_index === currentWeek.week_index);
        if (!updateData) return currentWeek;

        // Preserve completed week target_value
        const weekTargetValue = completedWeeks.has(currentWeek.week_index)
          ? currentWeek.target_value
          : updateData.target_value;

        // Update days, preserving completed day target_values and completion status
        const updatedDays = currentWeek.days.map(currentDay => {
          const updateDay = updateData.days?.find(d => d.date === currentDay.date);
          
          if (updateDay) {
            // Day exists in update data - merge
            return {
              ...updateDay,
              target_value: completedDays.has(currentDay.date)
                ? currentDay.target_value
                : updateDay.target_value,
              is_completed: currentDay.is_completed // Preserve completion status
            };
          } else {
            // Day not in update data - keep as is (could be completed or weekend)
            return {
              ...currentDay,
              is_completed: currentDay.is_completed // Ensure completion status is preserved
            };
          }
        });

        // Add any new days from updateData that don't exist in currentWeek.days
        const existingDates = new Set(currentWeek.days.map(d => d.date));
        const newDays = updateData.days
          .filter(updateDay => !existingDates.has(updateDay.date))
          .map(updateDay => ({
            ...updateDay,
            is_completed: false // New days are not completed
          }));

        const finalDays = [...updatedDays, ...newDays];

        return {
          ...updateData,
          target_value: weekTargetValue,
          days: finalDays
        };
      });
    }

    await kpi.update({ weeks: updatedWeeks });

    console.log('Updated weeks in database:', updatedWeeks);

    // Get the creator info
    const creator = await User.findByPk(kpi.created_by, {
      attributes: ['user_id', 'name']
    });

    // Construct response manually to ensure weeks field is included
    const responseKpi = {
      chain_kpi_id: kpi.chain_kpi_id,
      chain_id: kpi.chain_id,
      year: kpi.year,
      month: kpi.month,
      target_value: kpi.target_value,
      unit_label: kpi.unit_label,
      weeks: updatedWeeks,
      created_by: kpi.created_by,
      created_at: kpi.created_at,
      updated_at: new Date(),
      creator: creator
    };

    console.log('Response KPI weeks sample:', responseKpi.weeks?.[0]?.days?.slice(0, 2));

    res.json({
      message: 'Cập nhật KPI tuần thành công',
      kpi: responseKpi
    });
  } catch (err) {
    console.error('Update KPI weeks error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Update KPI days targets
 */
exports.updateKpiDays = async (req, res) => {
  try {
    const { kpi_id } = req.params;
    const { days } = req.body; // Array of { date, target_value }

    if (!Array.isArray(days)) {
      return res.status(400).json({ message: 'days phải là mảng' });
    }

    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) {
      return res.status(404).json({ message: 'KPI không tồn tại' });
    }

    // Allow updating days even with completions (frontend ensures only non-completed days are updated)

    // Validate days data
    for (const day of days) {
      if (!day.date || day.target_value === undefined || day.target_value < 0) {
        return res.status(400).json({ message: 'Dữ liệu ngày không hợp lệ' });
      }
    }

    // Update days in database
    const currentWeeks = kpi.weeks || [];
    const updatedWeeks = currentWeeks.map(week => ({
      ...week,
      days: week.days.map(day => {
        const updateData = days.find(d => d.date === day.date);
        return updateData ? { ...day, target_value: updateData.target_value } : day;
      })
    }));

    await kpi.update({ weeks: updatedWeeks });

    res.json({
      message: 'Cập nhật KPI ngày thành công',
      kpi: await ChainKpi.findByPk(kpi_id, {
        include: [{ model: User, as: 'creator', attributes: ['user_id', 'name'] }]
      })
    });
  } catch (err) {
    console.error('Update KPI days error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Delete KPI
 */
exports.deleteChainKpi = async (req, res) => {
  try {
    const { kpi_id } = req.params;

    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) {
      return res.status(404).json({ message: 'KPI không tồn tại' });
    }

    // Delete associated completions
    await KpiCompletion.destroy({ where: { chain_kpi_id: kpi_id } });

    // Delete KPI
    await kpi.destroy();

    res.json({ message: 'Xóa KPI thành công' });
  } catch (err) {
    console.error('Delete chain KPI error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Toggle week completion
 */
exports.toggleWeekCompletion = async (req, res) => {
  try {
    const { kpi_id, week_index } = req.params;
    const completed_by = req.user.user_id;

    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) {
      return res.status(404).json({ message: 'KPI không tồn tại' });
    }

    // Check if completion already exists
    const existingCompletion = await KpiCompletion.findOne({
      where: {
        chain_kpi_id: kpi_id,
        completion_type: 'week',
        week_index: parseInt(week_index)
      }
    });

    if (existingCompletion) {
      // Remove completion
      await existingCompletion.destroy();
      res.json({ message: 'Hủy hoàn thành tuần thành công' });
    } else {
      // Add completion
      await KpiCompletion.create({
        chain_kpi_id: kpi_id,
        completion_type: 'week',
        week_index: parseInt(week_index),
        completed_by
      });
      res.json({ message: 'Đánh dấu hoàn thành tuần thành công' });
    }

    // Auto-manage day completions
    const weekIndexNum = parseInt(week_index);
    const workingDays = getWorkingDaysInWeek(kpi, weekIndexNum);

    if (existingCompletion) {
      // Week was completed, now uncompleted - remove all day completions in this week
      await KpiCompletion.destroy({
        where: {
          chain_kpi_id: kpi_id,
          completion_type: 'day',
          date_iso: workingDays
        }
      });
    } else {
      // Week was not completed, now completed - add all day completions in this week
      const dayCompletions = workingDays.map(dateIso => ({
        chain_kpi_id: kpi_id,
        completion_type: 'day',
        date_iso: dateIso,
        completed_by
      }));
      await KpiCompletion.bulkCreate(dayCompletions);
    }

    await refreshMonthlyAccumulationState(kpi);

  } catch (err) {
    console.error('Toggle week completion error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Toggle day completion
 */
exports.toggleDayCompletion = async (req, res) => {
  console.log('toggleDayCompletion called with:', req.params);
  try {
    const { kpi_id, date_iso } = req.params;
    const completed_by = req.user?.user_id;

    if (!completed_by) {
      console.log('No user found in request');
      return res.status(401).json({ message: 'Người dùng chưa đăng nhập' });
    }

    console.log('completed_by from req.user.user_id:', completed_by, 'type:', typeof completed_by);

    console.log('Looking for KPI:', kpi_id);
    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) {
      console.log('KPI not found:', kpi_id);
      return res.status(404).json({ message: 'KPI không tồn tại' });
    }

    console.log('KPI found, weeks data:', !!kpi.weeks);

    // Validate inputs
    const kpiIdNum = parseInt(kpi_id);
    const userIdNum = parseInt(completed_by);

    if (isNaN(kpiIdNum) || kpiIdNum <= 0) {
      return res.status(400).json({ message: 'ID KPI không hợp lệ' });
    }

    if (isNaN(userIdNum) || userIdNum <= 0) {
      return res.status(400).json({ message: 'ID người dùng không hợp lệ' });
    }

    // Validate date format
    if (!date_iso || !/^\d{4}-\d{2}-\d{2}$/.test(date_iso)) {
      return res.status(400).json({ message: 'Định dạng ngày không hợp lệ (yyyy-mm-dd)' });
    }

    // Check if completion already exists
    const existingCompletion = await KpiCompletion.findOne({
      where: {
        chain_kpi_id: kpiIdNum,
        completion_type: 'day',
        date_iso
      }
    });

    let isCompleted = false;
    if (existingCompletion) {
      console.log('Removing existing completion');
      // Remove completion
      await existingCompletion.destroy();
      res.json({ message: 'Hủy hoàn thành ngày thành công' });
    } else {
      console.log('Creating new completion for kpi_id:', kpiIdNum, 'date:', date_iso, 'user:', userIdNum);
      // Add completion
      await KpiCompletion.create({
        chain_kpi_id: kpiIdNum,
        completion_type: 'day',
        date_iso,
        completed_by: userIdNum
      });
      isCompleted = true;
      res.json({ message: 'Đánh dấu hoàn thành ngày thành công' });
    }

    // Auto-manage week completion
    const targetDate = new Date(date_iso);
    let weekIndex = null;
    if (kpi.weeks && Array.isArray(kpi.weeks)) {
      for (const week of kpi.weeks) {
        if (week && week.start_date && week.end_date) {
          const weekStart = new Date(week.start_date);
          const weekEnd = new Date(week.end_date);
          if (targetDate >= weekStart && targetDate <= weekEnd) {
            weekIndex = week.week_index;
            break;
          }
        }
      }
    }

    if (weekIndex === null) {
      // Date not found in any week, skip week completion logic
      return;
    }

    const workingDays = getWorkingDaysInWeek(kpi, weekIndex);
    console.log('Working days for week', weekIndex, ':', workingDays);

    if (workingDays.length === 0) {
      console.log('No working days found, skipping week completion logic');
      return;
    }

    // Check if all working days in the week are completed
    const completedDays = await KpiCompletion.findAll({
      where: {
        chain_kpi_id: kpiIdNum,
        completion_type: 'day',
        date_iso: workingDays
      }
    });
    console.log('Completed days count:', completedDays.length, 'out of', workingDays.length);

    const allWorkingDaysCompleted = workingDays.length > 0 && completedDays.length === workingDays.length;

    // Check if week completion exists
    const weekCompletion = await KpiCompletion.findOne({
      where: {
        chain_kpi_id: kpiIdNum,
        completion_type: 'week',
        week_index: weekIndex
      }
    });
    console.log('Week completion exists:', !!weekCompletion);

    if (allWorkingDaysCompleted && !weekCompletion) {
      console.log('Auto-completing week', weekIndex);
      // Auto-complete week
      await KpiCompletion.create({
        chain_kpi_id: kpiIdNum,
        completion_type: 'week',
        week_index: weekIndex,
        completed_by: userIdNum
      });
    } else if (!allWorkingDaysCompleted && weekCompletion) {
      console.log('Auto-uncompleting week', weekIndex);
      // Auto-uncomplete week
      await weekCompletion.destroy();
    }

    await refreshMonthlyAccumulationState(kpi);

  } catch (err) {
    console.error('Toggle day completion error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Get KPI completions
 */
exports.getKpiCompletions = async (req, res) => {
  try {
    const { kpi_id } = req.params;

    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) {
      return res.status(404).json({ message: 'KPI không tồn tại' });
    }

    const completions = await KpiCompletion.findAll({
      where: { chain_kpi_id: kpi_id },
      order: [['completed_at', 'ASC']]
    });

    res.json(completions);
  } catch (err) {
    console.error('Get KPI completions error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Check if a production chain has any activities (KPI completions or completed tasks)
 * Used to determine if chain editing should be locked
 */
exports.checkChainActivities = async (req, res) => {
  try {
    const { chain_id } = req.params;

    // Validate chain exists
    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    // Check if chain has any KPI completions
    const kpiCompletionsCount = await KpiCompletion.count({
      include: [{
        model: ChainKpi,
        where: { chain_id: chain_id }
      }]
    });

    // Check if chain has any completed tasks
    const completedTasksCount = await Task.count({
      where: {
        chain_id: chain_id,
        status: 'completed'
      }
    });

    // Chain has activities if it has either KPI completions or completed tasks
    const hasActivities = kpiCompletionsCount > 0 || completedTasksCount > 0;

    console.log(`🔍 Chain ${chain_id} activities check:`, {
      kpiCompletions: kpiCompletionsCount,
      completedTasks: completedTasksCount,
      hasActivities
    });

    res.json({
      hasActivities,
      kpiCompletionsCount,
      completedTasksCount
    });

  } catch (err) {
    console.error('Check chain activities error:', err);
    res.status(500).json({ message: 'Lỗi server khi kiểm tra hoạt động chuỗi' });
  }
};

/**
 * Update production chain total KPI
 * DEPRECATED: total_kpi field removed from ProductionChain
 */
/*
exports.updateChainTotalKpi = async (req, res) => {
  try {
    const { chain_id } = req.params;
    const { total_kpi } = req.body;

    if (total_kpi === undefined || total_kpi < 0) {
      return res.status(400).json({ message: 'total_kpi phải là số không âm' });
    }

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    await chain.update({ total_kpi });

    res.json({
      message: 'Cập nhật tổng KPI thành công',
      chain: await ProductionChain.findByPk(chain_id, {
        include: [
          {
            model: ProductionChainStep,
            as: 'steps',
            attributes: ['step_id', 'step_order', 'department_id', 'title', 'description']
          }
        ]
      })
    });
  } catch (err) {
    console.error('Update chain total KPI error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
*/

/**
 * Update chain KPI
 */
exports.updateChainKpi = async (req, res) => {
  try {
    const { kpi_id } = req.params;
    const { target_value } = req.body;

    console.log('Update KPI request:', { kpi_id, target_value, type: typeof target_value });

    const targetValue = parseInt(target_value, 10);
    if (isNaN(targetValue) || targetValue < 0) {
      return res.status(400).json({ message: 'target_value phải là số nguyên không âm' });
    }

    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) {
      return res.status(404).json({ message: 'KPI không tồn tại' });
    }

    console.log('Found KPI:', kpi.toJSON());

    await kpi.update({ target_value: targetValue });

    console.log('Updated KPI target_value to:', targetValue);

    const updatedKpi = await ChainKpi.findByPk(kpi_id);
    console.log('Updated KPI:', updatedKpi.toJSON());

    res.json({
      message: 'Cập nhật KPI thành công',
      kpi: updatedKpi
    });
  } catch (err) {
    console.error('Update chain KPI error:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

/**
 * Delete chain KPI
 */
exports.deleteChainKpi = async (req, res) => {
  try {
    const { kpi_id } = req.params;

    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) {
      return res.status(404).json({ message: 'KPI không tồn tại' });
    }

    // Delete associated completions first
    await KpiCompletion.destroy({ where: { chain_kpi_id: kpi_id } });

    // Delete the KPI
    await kpi.destroy();

    res.json({ message: 'Xóa KPI thành công' });
  } catch (err) {
    console.error('Delete chain KPI error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Assign a week of KPI steps to users and optionally record handover
 */
exports.assignWeek = async (req, res) => {
  try {
    const { kpi_id } = req.params;
    const { week_index, assignments } = req.body;
    const actor = req.user.user_id;

    if (!kpi_id || week_index === undefined || !Array.isArray(assignments)) {
      return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' });
    }

    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) return res.status(404).json({ message: 'KPI không tồn tại' });

    const sequelize = require('../config/db');

    // Run validation and inserts inside a transaction with row locks to avoid race conditions
    const results = await sequelize.transaction(async (trx) => {
      // Lock the KPI row to serialize assignments for this KPI
      await ChainKpi.findByPk(kpi_id, { transaction: trx, lock: trx.LOCK.UPDATE });

      // Fetch existing assignments for this KPI/week and lock them
      const existing = await ChainKpiAssignment.findAll({
        where: { chain_kpi_id: kpi_id, week_index: Number(week_index) },
        transaction: trx,
        lock: trx.LOCK.UPDATE
      });

      // Collect step_ids we need department info for (from existing + incoming)
      const stepIds = new Set(existing.map(r => r.step_id));
      assignments.forEach(a => { if (a.step_id) stepIds.add(a.step_id); });
      const stepIdList = Array.from(stepIds).filter(Boolean);

      // Fetch steps to get department_id mapping
      const steps = stepIdList.length > 0 ? await ProductionChainStep.findAll({ where: { step_id: stepIdList }, transaction: trx }) : [];
      const stepMap = {};
      steps.forEach(s => { stepMap[s.step_id] = s; });

      // Build existing totals grouped by department and date
      const totalsByDept = {};
      existing.forEach(rec => {
        const step = stepMap[rec.step_id];
        const deptId = step ? String(step.department_id || '') : '';
        if (!totalsByDept[deptId]) totalsByDept[deptId] = {};
        const dr = rec.day_assignments || {};
        Object.keys(dr).forEach(date => {
          const v = Number(dr[date] || 0);
          totalsByDept[deptId][date] = (totalsByDept[deptId][date] || 0) + v;
        });
      });

      // Prepare displayDays for validation
      const weekObj = (kpi.weeks || []).find(w => w.week_index === Number(week_index));
      const kpiStart = kpi.start_date ? new Date(kpi.start_date) : null;
      const kpiEnd = kpi.end_date ? new Date(kpi.end_date) : null;
      const displayDays = (weekObj?.days || []).filter((d) => {
        const dt = new Date(d.date);
        if (kpiStart && dt < kpiStart) return false;
        if (kpiEnd && dt > kpiEnd) return false;
        return true;
      });

      // Validate incoming assignments per department/day
      for (const a of assignments) {
        const { step_id, day_assignments } = a;
        const step = stepMap[step_id];
        const deptId = step ? String(step.department_id || '') : '';
        if (!step) return res.status(400).json({ message: `Step ${step_id} không tồn tại` });

        if (day_assignments) {
          Object.keys(day_assignments).forEach(date => {
            const nv = Number(day_assignments[date] || 0);
            if (nv < 0) {
              throw new Error('Giá trị phân bổ theo ngày phải là số không âm');
            }
            totalsByDept[deptId] = totalsByDept[deptId] || {};
            totalsByDept[deptId][date] = (totalsByDept[deptId][date] || 0) + nv;
          });
        }
      }

      // Perform validation against day targets for each relevant department/date
      for (const d of displayDays) {
        const date = d.date;
        const dayTarget = Number(d.target_value || 0);
        // For all departments that have totals for this date, validate
        for (const deptId of Object.keys(totalsByDept)) {
          const total = Number(totalsByDept[deptId][date] || 0);
          if (total > dayTarget) {
            throw new Error(`Tổng KPI đã giao cho ngày ${date} (phòng ${deptId}) vượt quá giới hạn (${total}/${dayTarget})`);
          }
        }
      }

      // If validation passes, create records within the transaction
      const created = [];
      for (const a of assignments) {
        const { step_id, assigned_to, day_assignments, day_titles } = a;
        const payload = {
          chain_kpi_id: kpi_id,
          week_index,
          step_id,
          assigned_to: assigned_to || null,
          day_assignments: day_assignments || {},
          day_titles: day_titles || {},
          created_by: actor
        };
        const rec = await ChainKpiAssignment.create(payload, { transaction: trx });
        created.push(rec.toJSON());
      }

      return created;
    });

    const assignedRecords = results.filter((record) => record.assigned_to);
    const normalizedWeekIndex = Number(week_index);
    try {
      if (assignedRecords.length) {
        const assigneeIds = uniqueIntegers(assignedRecords.map((record) => record.assigned_to));
        const stepIds = uniqueIntegers(results.map((record) => record.step_id));
        const [assignees, steps, chain] = await Promise.all([
          assigneeIds.length
            ? User.findAll({ where: { user_id: assigneeIds }, attributes: ['user_id', 'name'] })
            : [],
          stepIds.length
            ? ProductionChainStep.findAll({ where: { step_id: stepIds }, attributes: ['step_id', 'title'] })
            : [],
          ProductionChain.findByPk(kpi.chain_id, { attributes: ['chain_id', 'name'] })
        ]);

        const assigneeMap = new Map(assignees.map((user) => [user.user_id, user]));
        const stepMap = new Map(steps.map((step) => [step.step_id, step]));
        const weekInfo = getWeekInfo(kpi, normalizedWeekIndex);
        const actorLabel = getActorLabel(req.user);

        await Promise.all(
          assignedRecords.map((assignment) => {
            const step = stepMap.get(assignment.step_id);
            const deadline = getAssignmentDeadline(assignment, weekInfo);
            const chainName = chain?.name || `KPI #${kpi_id}`;
            const stepSuffix = step?.title ? ` ${step.title}` : '';
            const safeMessage = `${actorLabel} giao bạn nhiệm vụ${stepSuffix} tuần ${normalizedWeekIndex}`.trim();

            return createUserNotification({
              type: 'task',
              title: `Giao việc ${chainName}`,
              message: safeMessage,
              metadata: {
                assignment_id: assignment.assignment_id,
                week_index: normalizedWeekIndex,
                chain_id: chain?.chain_id || kpi.chain_id,
                step_title: step?.title || null,
                assignee_name: assigneeMap.get(assignment.assigned_to)?.name || null,
                deadline
              },
              entityType: 'chain_kpi_assignment',
              entityId: assignment.assignment_id,
              recipientUserId: assignment.assigned_to
            });
          })
        );

        await createAdminNotification({
          type: 'chain_assignment',
          title: 'Phân công KPI',
          message: `${actorLabel} đã giao ${assignedRecords.length} nhiệm vụ cho tuần ${normalizedWeekIndex} của chuỗi ${chain?.name || ''}`.trim(),
          metadata: {
            chain_id: chain?.chain_id || kpi.chain_id,
            assignment_ids: assignedRecords.map((assignment) => assignment.assignment_id),
            week_index: normalizedWeekIndex,
            event: 'assigned'
          },
          entityType: 'chain_kpi',
          entityId: Number(kpi_id)
        });
      }
    } catch (notifyErr) {
      console.error('Không thể gửi thông báo giao việc', notifyErr);
    }

    return res.json({ message: 'Lưu giao việc thành công', assignments: results });
  } catch (err) {
    console.error('assignWeek error', err);
    const status = err && err.status ? err.status : 500;
    const message = err && err.message ? err.message : 'Lỗi server';
    res.status(status).json({ message });
  }
};

/**
 * Get current user's assignments
 */
exports.getMyAssignments = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const items = await ChainKpiAssignment.findAll({
      where: { assigned_to: userId },
      include: [
        { model: ChainKpi, as: 'kpi' },
        { model: User, as: 'assignee' }
      ],
      order: [['week_index', 'ASC'], ['step_id', 'ASC']]
    });

    res.json(items.map(i => i.toJSON()));
  } catch (err) {
    console.error('getMyAssignments error', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Save a result link for a specific assignment day
 */
exports.saveAssignmentDayResult = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const { date, link, slotIndex } = req.body;
    const actor = req.user.user_id;

    if (!assignment_id || !date || !link) return res.status(400).json({ message: 'Thiếu date hoặc link' });

    const record = await ChainKpiAssignment.findByPk(assignment_id);
    if (!record) return res.status(404).json({ message: 'Assignment không tồn tại' });

    // Require employee to accept assignment before saving results
    if (!record.accepted) return res.status(400).json({ message: 'Bạn cần nhấn nhận KPI trước khi lưu kết quả' });

    const current = record.day_results || {};

    if (typeof slotIndex === 'number') {
      const arr = Array.isArray(current[date]) ? current[date] : (current[date] ? [current[date]] : []);
      arr[slotIndex] = { link, saved_by: actor, saved_at: new Date() };
      current[date] = arr;
    } else {
      current[date] = { link, saved_by: actor, saved_at: new Date() };
    }

    await record.update({ day_results: current });

    // Notify leaders to review/confirm this day's result
    const notifMsg = `Nhân viên đã nộp kết quả cho KPI ${record.chain_kpi_id} - ngày ${date}. Vui lòng kiểm tra.`;
    await createLeaderNotification({
      type: 'kpi_result',
      title: 'Kết quả KPI đã nộp',
      message: notifMsg,
      metadata: { assignment_id, date, slotIndex },
      entityType: 'chain_kpi_assignment',
      entityId: assignment_id
    });

    return res.json({ message: 'Lưu kết quả thành công', assignment: record.toJSON() });
  } catch (err) {
    console.error('saveAssignmentDayResult error', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const notifyLeaderAboutAcceptance = (assignment) => {
  if (!assignment) return Promise.resolve();

  const notifMsg = `Nhân viên đã nhận KPI ${assignment.chain_kpi_id} (bước ${assignment.step_id}) tuần ${assignment.week_index}. Vui lòng xác nhận.`;
  return createLeaderNotification({
    type: 'kpi_accept',
    title: 'Nhận KPI',
    message: notifMsg,
    metadata: { assignment_id: assignment.assignment_id },
    entityType: 'chain_kpi_assignment',
    entityId: assignment.assignment_id
  });
};

/**
 * Employee accepts an assignment (claims it) — notifies leaders
 */
exports.acceptAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const actor = req.user.user_id;

    if (!assignment_id) return res.status(400).json({ message: 'Thiếu assignment_id' });

    const record = await ChainKpiAssignment.findByPk(assignment_id);
    if (!record) return res.status(404).json({ message: 'Assignment không tồn tại' });

    if (!record.accepted) {
      await record.update({ accepted: true, accepted_by: actor, accepted_at: new Date() });

      notifyLeaderAboutAcceptance(record).catch((err) => {
        console.warn('notifyLeaderAboutAcceptance failed', err);
      });
    }

    return res.json({ accepted: true, assignment: record.toJSON() });
  } catch (err) {
    console.error('acceptAssignment error', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Get assignments for a KPI and week
 */
exports.getAssignmentsForKpiWeek = async (req, res) => {
  try {
    const { kpi_id } = req.params;
    const { week_index } = req.query;
    if (!kpi_id || !week_index) return res.status(400).json({ message: 'Thiếu kpi_id hoặc week_index' });

    const items = await ChainKpiAssignment.findAll({
      where: { chain_kpi_id: kpi_id, week_index: Number(week_index) }
    });

    return res.json(items.map(i => i.toJSON()));
  } catch (err) {
    console.error('getAssignmentsForKpiWeek error', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};