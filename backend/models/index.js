/**
 * Models Index
 * Central export point for all Sequelize models
 */

// Core models
const User = require('./User');
const Department = require('./Department');

// Production Chain
const ProductionChain = require('./ProductionChain');
const ProductionChainStep = require('./ProductionChainStep');
const ProductionChainFeedback = require('./ProductionChainFeedback');
const ChainKpi = require('./ChainKpi');
const KpiCompletion = require('./KpiCompletion');

// Timesheet
const Timesheet = require('./Timesheet');

// Notifications & Profile
const Notification = require('./Notification');
const ProfileUpdateRequest = require('./ProfileUpdateRequest');

// Setup associations
const setupAssociations = require('./associations');

const models = {
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
};

// Initialize associations
setupAssociations(models);

module.exports = models;
