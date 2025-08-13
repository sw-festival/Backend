const sequelize = require('../../config/database');
const Product = require('./Product');

async function initDB({ alter = false, force = false } = {}) {
  await sequelize.authenticate();
  await sequelize.sync({ alter, force });
  return { sequelize, Product };
}

module.exports = { sequelize, Product, initDB };
