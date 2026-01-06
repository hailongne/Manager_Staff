const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const productionChainController = require('../controllers/productionChainController');

// All routes require authentication
router.use(auth);

// Admin only routes
router.post('/', authorize('admin'), productionChainController.createChain);
router.put('/:chain_id', authorize('admin'), productionChainController.updateChain);
router.patch('/:chain_id/disable', authorize('admin'), productionChainController.disableChain);
router.patch('/:chain_id/enable', authorize('admin'), productionChainController.enableChain);
router.delete('/:chain_id', authorize('admin'), productionChainController.deleteChain);
router.post('/:chain_id/start', authorize('admin'), productionChainController.startChain);

// Admin and Manager routes
router.get('/', authorize(['admin', 'leader']), productionChainController.getChains);
router.get('/disabled', authorize(['admin', 'leader']), productionChainController.getDisabledChains);
router.get('/:chain_id/activities', authorize(['admin', 'leader']), productionChainController.checkChainActivities);

// Complete task step (any user can complete their task)
router.post('/task/:task_id/complete', productionChainController.completeTaskStep);

// KPI routes
router.get('/:chain_id/kpis', authorize(['admin', 'leader']), productionChainController.getChainKpis);
router.post('/:chain_id/kpis', authorize('admin'), productionChainController.createChainKpi);
router.put('/kpis/:kpi_id', authorize(['admin', 'leader']), productionChainController.updateChainKpi);
router.put('/kpis/:kpi_id/weeks', authorize(['admin', 'leader']), productionChainController.updateKpiWeeks);
router.put('/kpis/:kpi_id/days', authorize(['admin', 'leader']), productionChainController.updateKpiDays);
router.delete('/kpis/:kpi_id', authorize('admin'), productionChainController.deleteChainKpi);

// Assign a week of KPI steps
router.post('/kpis/:kpi_id/assign-week', authorize(['admin', 'leader']), productionChainController.assignWeek);
router.get('/kpis/:kpi_id/assignments', authorize(['admin', 'leader']), productionChainController.getAssignmentsForKpiWeek);

// KPI completion routes
router.get('/kpis/:kpi_id/completions', authorize(['admin', 'leader']), productionChainController.getKpiCompletions);
router.post('/kpis/:kpi_id/complete-week/:week_index', authorize(['admin', 'leader']), productionChainController.toggleWeekCompletion);
router.post('/kpis/:kpi_id/complete-day/:date_iso', authorize(['admin', 'leader']), productionChainController.toggleDayCompletion);

module.exports = router;