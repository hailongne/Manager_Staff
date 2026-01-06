const express = require('express');
require('dotenv').config();

// Add error handlers for debugging
process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION', err);
});

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION', err);
});

const app = express();
const sequelize = require('./config/db');
const { port } = require('./config/app');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

// Load models and associations
require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const profileUpdateRoutes = require('./routes/profileUpdateRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const productionChainRoutes = require('./routes/productionChainRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');

// ============= MIDDLEWARE =============
app.use(express.json());

// ============= API ROUTES =============
// Auth
app.use('/api/auth', authRoutes);

// Users
app.use('/api/users', userRoutes);

// Time Management
app.use('/api/timesheets', timesheetRoutes);

// Profile
app.use('/api/profile-updates', profileUpdateRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// Organization
app.use('/api/departments', departmentRoutes);

// Production Chains assignments (must be before the main production-chains router)
app.use('/api/production-chains/assignments', assignmentRoutes);
// Production Chains
app.use('/api/production-chains', productionChainRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function bootstrap() {
  try {
    console.log('[1] Authenticating...');
    await sequelize.authenticate();
    console.log('✓ DB authenticated');
    
    const shouldSync = process.env.FORCE_SYNC === 'true';
    
    if (shouldSync) {
      console.log('[2] Running forced sync...');
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      await sequelize.sync({ alter: true });
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✓ Models synced');
    } else {
      console.log('[2] Sync skipped (set FORCE_SYNC=true to enable)');
    }

    app.listen(port, () =>
      console.log(`✓ Server running on port ${port}`)
    );
  } catch (error) {
    console.error('Không thể khởi động máy chủ:', error);
    process.exit(1);
  }
}

bootstrap();
