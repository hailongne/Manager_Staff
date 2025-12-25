/**
 * Config Index
 * Central export for all configurations
 */

const sequelize = require('./db');
const appConfig = require('./app');

module.exports = {
  sequelize,
  db: sequelize,
  app: appConfig,
  ...appConfig
};
