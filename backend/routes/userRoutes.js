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
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { upload: uploadConfig } = require('../config/app');

// Ensure upload folder exists
const cvUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'cv');
fs.mkdirSync(cvUploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, cvUploadDir);
	},
	filename: function (req, file, cb) {
		const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
		cb(null, `${Date.now()}-${safe}`);
	}
});

const upload = multer({
	storage,
	limits: { fileSize: uploadConfig.maxFileSize },
	fileFilter: (req, file, cb) => {
		if (uploadConfig.allowedTypes.includes(file.mimetype)) return cb(null, true);
		cb(new Error('Invalid file type'));
	}
});

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

// POST /api/users/:id/cv - Upload CV file for user
router.post('/:id/cv', upload.single('cv'), userController.uploadCv);

// ============= ADMIN ONLY =============
// POST /api/users - Create new user (admin only)
router.post('/', authorize('admin'), userController.createUser);

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;
