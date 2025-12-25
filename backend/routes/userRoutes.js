/**
 * User Routes
 * RESTful API for user management
 * 
 * Base path: /api/users
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const userController = require('../controllers/userController');

// ============= PUBLIC ROUTES =============
// POST /api/users/register - Register new user
router.post('/register', userController.register);

// POST /api/users/login - User login
router.post('/login', userController.login);

// POST /api/users/logout - User logout
router.post('/logout', userController.logout);

// ============= AUTHENTICATED ROUTES =============
router.use(auth);

// GET /api/users/me - Get current user profile
router.get('/me', userController.getCurrentUser);

// PATCH /api/users/me/password - Change password
router.patch('/me/password', userController.changePassword);

// GET /api/users - List users (filtered by role permissions)
router.get('/', userController.getUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', userController.getUserById);

// PUT /api/users/:id - Update user
router.put('/:id', userController.updateUser);

// ============= ADMIN ONLY =============
// POST /api/users - Create new user (admin only)
router.post('/', authorize('admin'), userController.createUser);

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;
