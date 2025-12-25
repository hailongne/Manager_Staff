/**
 * Production Chain Controller
 * API for managing production chains and steps
 */

const { ProductionChain, ProductionChainStep, ProductionChainFeedback, ChainKpi, KpiCompletion, Department, Task, User } = require('../models');
const { HTTP_STATUS } = require('../utils/constants');
const { Op } = require('sequelize');
const { calculateKpiDistribution } = require('../utils/kpiHelpers');

// Helper function to sync chain KPIs with date range
const syncChainKpis = async (chainId, startDate, endDate, totalKpi, createdBy) => {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;

  // Get all months in the new date range
  const requiredMonths = [];
  for (let year = startYear; year <= endYear; year++) {
    const monthStart = year === startYear ? startMonth : 1;
    const monthEnd = year === endYear ? endMonth : 12;

    for (let month = monthStart; month <= monthEnd; month++) {
      requiredMonths.push({ year, month });
    }
  }

  // Get existing KPIs
  const existingKpis = await ChainKpi.findAll({
    where: { chain_id: chainId },
    attributes: ['chain_kpi_id', 'year', 'month']
  });

  // Find KPIs to delete (those not in the new date range)
  const existingMonths = existingKpis.map(kpi => `${kpi.year}-${kpi.month}`);
  const requiredMonthsStr = requiredMonths.map(m => `${m.year}-${m.month}`);

  const kpisToDelete = existingKpis.filter(kpi => 
    !requiredMonthsStr.includes(`${kpi.year}-${kpi.month}`)
  );

  // Delete KPIs that are no longer needed
  if (kpisToDelete.length > 0) {
    await ChainKpi.destroy({
      where: { chain_kpi_id: kpisToDelete.map(kpi => kpi.chain_kpi_id) }
    });
  }

  // Calculate total months
  const totalMonths = requiredMonths.length;

  // Distribute total_kpi evenly among months
  const baseKpi = Math.floor(totalKpi / totalMonths);
  const remainder = totalKpi % totalMonths;

  // Create new KPIs for months that don't exist
  const kpiPromises = [];
  for (let i = 0; i < requiredMonths.length; i++) {
    const month = requiredMonths[i];
    const exists = existingMonths.includes(`${month.year}-${month.month}`);
    if (!exists) {
      const targetValue = baseKpi + (i < remainder ? 1 : 0);
      kpiPromises.push(
        ChainKpi.create({
          chain_id: chainId,
          year: month.year,
          month: month.month,
          target_value: targetValue,
          unit_label: 'sản phẩm',
          notes: '',
          created_by: createdBy
        })
      );
    }
  }

  await Promise.all(kpiPromises);

  // Update target_value for all remaining KPIs
  for (let i = 0; i < requiredMonths.length; i++) {
    const month = requiredMonths[i];
    const targetValue = baseKpi + (i < remainder ? 1 : 0);
    await ChainKpi.update(
      { target_value: targetValue },
      { where: { chain_id: chainId, year: month.year, month: month.month } }
    );
  }
};

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
  const days = [];
  const weekStart = new Date(weekIndex);
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    if (date.getMonth() + 1 === kpi.month && date.getFullYear() === kpi.year) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        days.push(createDateKey(date));
      }
    }
  }
  return days;
};

/**
 * Create new production chain
 */
exports.createChain = async (req, res) => {
  try {
    const { name, description, start_date, end_date, total_kpi, steps } = req.body;
    const created_by = req.user.user_id;

    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ message: 'Tên và các bước là bắt buộc' });
    }

    // Validate dates and KPI
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Ngày bắt đầu và kết thúc là bắt buộc' });
    }

    if (total_kpi === undefined || total_kpi < 0) {
      return res.status(400).json({ message: 'Mục tiêu KPI phải là số không âm' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
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
      start_date: startDate,
      end_date: endDate,
      total_kpi,
      created_by
    });

    // Create steps
    const stepPromises = steps.map((step) =>
      ProductionChainStep.create({
        chain_id: chain.chain_id,
        step_order: step.step_order,
        department_id: step.department_id,
        title: step.title,
        description: step.description
      })
    );

    await Promise.all(stepPromises);

    // Create KPIs for all months in the chain period
    const kpiPromises = [];
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;

    // Calculate total months
    let totalMonths = 0;
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 1;
      const monthEnd = year === endYear ? endMonth : 12;
      totalMonths += monthEnd - monthStart + 1;
    }

    // Distribute total_kpi evenly among months
    const baseKpi = Math.floor(total_kpi / totalMonths);
    const remainder = total_kpi % totalMonths;
    let monthIndex = 0;

    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 1;
      const monthEnd = year === endYear ? endMonth : 12;

      for (let month = monthStart; month <= monthEnd; month++) {
        // Check if KPI already exists for this month
        const existingKpi = await ChainKpi.findOne({
          where: { chain_id: chain.chain_id, year, month }
        });

        if (!existingKpi) {
          const targetValue = baseKpi + (monthIndex < remainder ? 1 : 0);
          
          // Calculate KPI distribution for this month
          const monthStartDate = new Date(year, month - 1, 1);
          const monthEndDate = new Date(year, month, 0); // Last day of month
          
          // Adjust to chain dates if this is the first/last month
          const actualStartDate = (year === startYear && month === startMonth) ? startDate : monthStartDate;
          const actualEndDate = (year === endYear && month === endMonth) ? endDate : monthEndDate;
          
          const distribution = calculateKpiDistribution(
            targetValue, 
            actualStartDate.toISOString().split('T')[0], 
            actualEndDate.toISOString().split('T')[0]
          );
          
          kpiPromises.push(
            ChainKpi.create({
              chain_id: chain.chain_id,
              year,
              month,
              target_value: targetValue,
              unit_label: 'sản phẩm',
              weeks: distribution.weeks,
              created_by
            })
          );
          monthIndex++;
        }
      }
    }

    await Promise.all(kpiPromises);

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
    const { name, description, start_date, end_date, total_kpi, steps } = req.body;

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
      
      if (start_date !== undefined || end_date !== undefined) {
        return res.status(400).json({ message: 'Không thể chỉnh sửa thời gian của chuỗi đã có dữ liệu hoàn thành' });
      }

      // Allow updating total_kpi even with completions - it will sync target_value
      if (total_kpi !== undefined) {
        await chain.update({ total_kpi });
        // Sync target_value of all chain KPIs by redistributing total_kpi
        const chainKpis = await ChainKpi.findAll({
          where: { chain_id },
          order: [['year', 'ASC'], ['month', 'ASC']]
        });
        const totalMonths = chainKpis.length;
        if (totalMonths > 0) {
          const baseKpi = Math.floor(total_kpi / totalMonths);
          const remainder = total_kpi % totalMonths;
          for (let i = 0; i < chainKpis.length; i++) {
            const targetValue = baseKpi + (i < remainder ? 1 : 0);
            await chainKpis[i].update({ target_value: targetValue });
          }
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
              title: stepUpdate.title,
              description: stepUpdate.description
            });
          }
        }
      }
    } else {
      // Allow full update
      if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ message: 'Tên và các bước là bắt buộc' });
      }

      // Validate dates and KPI
      if (!start_date || !end_date) {
        return res.status(400).json({ message: 'Ngày bắt đầu và kết thúc là bắt buộc' });
      }

      if (total_kpi === undefined || total_kpi < 0) {
        return res.status(400).json({ message: 'Mục tiêu KPI phải là số không âm' });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (startDate >= endDate) {
        return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
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
        description,
        start_date: startDate,
        end_date: endDate,
        total_kpi
      });

      // Update target_value of all chain KPIs to match the new total_kpi
      await ChainKpi.update(
        { target_value: total_kpi },
        { where: { chain_id } }
      );

      // Delete existing steps
      await ProductionChainStep.destroy({ where: { chain_id } });

      // Create new steps
      const stepPromises = steps.map((step) =>
        ProductionChainStep.create({
          chain_id,
          step_order: step.step_order,
          department_id: step.department_id,
          title: step.title,
          description: step.description
        })
      );

      await Promise.all(stepPromises);

      // Sync KPIs with the new date range
      await syncChainKpis(chain_id, startDate, endDate, total_kpi, created_by);
    }

    // Always sync target_value with current total_kpi after any update
    const updatedChain = await ProductionChain.findByPk(chain_id);
    if (updatedChain && updatedChain.total_kpi !== null) {
      await ChainKpi.update(
        { target_value: updatedChain.total_kpi },
        { where: { chain_id } }
      );
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
    await ProductionChainFeedback.destroy({ where: { chain_id } });
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
    const { name, description, start_date, end_date, total_kpi, steps } = req.body;

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    // Validate dates and KPI
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (startDate >= endDate) {
        return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
      }
    }

    if (total_kpi !== undefined && total_kpi < 0) {
      return res.status(400).json({ message: 'Mục tiêu KPI phải là số không âm' });
    }

    // Update chain
    await chain.update({
      name: name || chain.name,
      description: description !== undefined ? description : chain.description,
      start_date: start_date ? new Date(start_date) : chain.start_date,
      end_date: end_date ? new Date(end_date) : chain.end_date,
      total_kpi: total_kpi !== undefined ? total_kpi : chain.total_kpi
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

    // Delete associated steps and tasks
    await ProductionChainStep.destroy({ where: { chain_id } });
    await Task.destroy({ where: { production_chain_id: chain_id } });

    // Delete chain
    await chain.destroy();

    res.json({ message: 'Xóa chuỗi sản xuất thành công' });
  } catch (err) {
    console.error('Delete chain error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Add feedback to production chain (Manager only)
 */
exports.addFeedback = async (req, res) => {
  try {
    const { chain_id } = req.params;
    const { feedback } = req.body;
    const feedback_by = req.user.user_id;

    if (!feedback || feedback.trim().length === 0) {
      return res.status(400).json({ message: 'Nội dung phản hồi là bắt buộc' });
    }

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    // Update chain with feedback
    await chain.update({
      feedback: feedback.trim(),
      feedback_by,
      feedback_at: new Date()
    });

    res.json({
      message: 'Thêm phản hồi thành công',
      chain: await ProductionChain.findByPk(chain_id, {
        include: [
          { model: User, as: 'creator' },
          { model: User, as: 'feedbackUser', attributes: ['user_id', 'name', 'email'] },
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
    console.error('Add feedback error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Update production chain
 */
exports.updateChain = async (req, res) => {
  try {
    const { chain_id } = req.params;
    const { name, description, start_date, end_date, total_kpi, steps } = req.body;

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ message: 'Tên và các bước là bắt buộc' });
    }

    // Validate dates and KPI
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Ngày bắt đầu và kết thúc là bắt buộc' });
    }

    if (total_kpi === undefined || total_kpi < 0) {
      return res.status(400).json({ message: 'Mục tiêu KPI phải là số không âm' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
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
      description,
      start_date: startDate,
      end_date: endDate,
      total_kpi
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
 * Get feedback conversation for a chain
 */
exports.getFeedbacks = async (req, res) => {
  try {
    const { chain_id } = req.params;

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    const feedbacks = await ProductionChainFeedback.findAll({
      where: { chain_id },
      include: [{ model: User, as: 'sender', attributes: ['user_id', 'name', 'email'] }],
      order: [['created_at', 'ASC']]
    });

    res.json(feedbacks);
  } catch (err) {
    console.error('Get feedbacks error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Add feedback message (Leader only)
 */
exports.addFeedbackMessage = async (req, res) => {
  try {
    const { chain_id } = req.params;
    const { message } = req.body;
    const sender_id = req.user.user_id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Nội dung phản hồi là bắt buộc' });
    }

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    // Check if user is leader
    if (req.user.role !== 'leader') {
      return res.status(403).json({ message: 'Chỉ trưởng nhóm mới có thể gửi phản hồi' });
    }

    const feedback = await ProductionChainFeedback.create({
      chain_id,
      message: message.trim(),
      sender_id,
      sender_role: 'leader'
    });

    res.status(201).json({
      message: 'Gửi phản hồi thành công',
      feedback: await ProductionChainFeedback.findByPk(feedback.feedback_id, {
        include: [{ model: User, as: 'sender', attributes: ['user_id', 'name', 'email'] }]
      })
    });
  } catch (err) {
    console.error('Add feedback message error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Reply to feedback (Admin only)
 */
exports.replyFeedback = async (req, res) => {
  try {
    const { chain_id } = req.params;
    const { message } = req.body;
    const sender_id = req.user.user_id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Nội dung trả lời là bắt buộc' });
    }

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ quản trị viên mới có thể trả lời phản hồi' });
    }

    const feedback = await ProductionChainFeedback.create({
      chain_id,
      message: message.trim(),
      sender_id,
      sender_role: 'admin'
    });

    res.status(201).json({
      message: 'Trả lời phản hồi thành công',
      feedback: await ProductionChainFeedback.findByPk(feedback.feedback_id, {
        include: [{ model: User, as: 'sender', attributes: ['user_id', 'name', 'email'] }]
      })
    });
  } catch (err) {
    console.error('Reply feedback error:', err);
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
        { model: User, as: 'creator', attributes: ['user_id', 'name'] },
        { model: ProductionChain, as: 'chain', attributes: ['start_date', 'end_date'] }
      ],
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    // Add start_date and end_date from chain to each KPI and calculate distribution
    const kpisWithDates = await Promise.all(kpis.map(async (kpi) => {
      const kpiData = kpi.toJSON();
      kpiData.start_date = kpi.chain?.start_date;
      kpiData.end_date = kpi.chain?.end_date;
      
      // Calculate KPI distribution if we have dates and no existing weeks
      if (kpiData.chain?.start_date && kpiData.chain?.end_date) {
        // If KPI already has weeks data, use it; otherwise calculate distribution
        if (!kpiData.weeks || kpiData.weeks.length === 0) {
          const startDateStr = kpiData.chain.start_date.toISOString().split('T')[0];
          const endDateStr = kpiData.chain.end_date.toISOString().split('T')[0];
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
    const { year, month, target_value, unit_label, notes } = req.body;
    const created_by = req.user.user_id;

    if (!year || !month || target_value === undefined) {
      return res.status(400).json({ message: 'Năm, tháng và mục tiêu KPI là bắt buộc' });
    }

    if (target_value <= 0) {
      return res.status(400).json({ message: 'Mục tiêu KPI phải lớn hơn 0' });
    }

    const chain = await ProductionChain.findByPk(chain_id);
    if (!chain) {
      return res.status(404).json({ message: 'Chuỗi sản xuất không tồn tại' });
    }

    // Check if KPI already exists for this month/year
    const existingKpi = await ChainKpi.findOne({
      where: { chain_id, year, month }
    });

    if (existingKpi) {
      return res.status(400).json({ message: 'KPI đã tồn tại cho tháng này' });
    }

    const kpi = await ChainKpi.create({
      chain_id,
      year,
      month,
      target_value,
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

    // If target_value was updated, sync total_kpi of the production chain
    if (target_value !== undefined) {
      await ProductionChain.update(
        { total_kpi: target_value },
        { where: { chain_id: kpi.chain_id } }
      );

      // Also sync target_value of all other KPIs in this chain
      await ChainKpi.update(
        { target_value },
        { where: { chain_id: kpi.chain_id, chain_kpi_id: { [Op.ne]: kpi_id } } }
      );
    }

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

  } catch (err) {
    console.error('Toggle week completion error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

/**
 * Toggle day completion
 */
exports.toggleDayCompletion = async (req, res) => {
  try {
    const { kpi_id, date_iso } = req.params;
    const completed_by = req.user.user_id;

    const kpi = await ChainKpi.findByPk(kpi_id);
    if (!kpi) {
      return res.status(404).json({ message: 'KPI không tồn tại' });
    }

    // Check if completion already exists
    const existingCompletion = await KpiCompletion.findOne({
      where: {
        chain_kpi_id: kpi_id,
        completion_type: 'day',
        date_iso
      }
    });

    let isCompleted = false;
    if (existingCompletion) {
      // Remove completion
      await existingCompletion.destroy();
      res.json({ message: 'Hủy hoàn thành ngày thành công' });
    } else {
      // Add completion
      await KpiCompletion.create({
        chain_kpi_id: kpi_id,
        completion_type: 'day',
        date_iso,
        completed_by
      });
      isCompleted = true;
      res.json({ message: 'Đánh dấu hoàn thành ngày thành công' });
    }

    // Auto-manage week completion
    const date = new Date(date_iso);
    const weekIndex = getWeekIndex(date);
    const workingDays = getWorkingDaysInWeek(kpi, weekIndex);

    // Check if all working days in the week are completed
    const completedDays = await KpiCompletion.findAll({
      where: {
        chain_kpi_id: kpi_id,
        completion_type: 'day',
        date_iso: workingDays
      }
    });
    const allWorkingDaysCompleted = workingDays.length > 0 && completedDays.length === workingDays.length;

    // Check if week completion exists
    const weekCompletion = await KpiCompletion.findOne({
      where: {
        chain_kpi_id: kpi_id,
        completion_type: 'week',
        week_index: weekIndex
      }
    });

    if (allWorkingDaysCompleted && !weekCompletion) {
      // Auto-complete week
      await KpiCompletion.create({
        chain_kpi_id: kpi_id,
        completion_type: 'week',
        week_index: weekIndex,
        completed_by
      });
    } else if (!allWorkingDaysCompleted && weekCompletion) {
      // Auto-uncomplete week
      await weekCompletion.destroy();
    }

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
 */
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