const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');

router.get('/', auth, getDepartments);
router.post('/', auth, authorize('admin'), createDepartment);
router.put('/:id', auth, authorize('admin'), updateDepartment);
router.delete('/:id', auth, authorize('admin'), deleteDepartment);

module.exports = router;
