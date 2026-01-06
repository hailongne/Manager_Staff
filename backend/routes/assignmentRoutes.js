const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const productionChainController = require('../controllers/productionChainController');

router.use(auth);

// Get assignments for current user
router.get('/my', productionChainController.getMyAssignments);
router.post('/:assignment_id/day-result', productionChainController.saveAssignmentDayResult);
router.post('/:assignment_id/accept', productionChainController.acceptAssignment);

module.exports = router;
