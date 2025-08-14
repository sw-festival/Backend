const sequelize = require('../../config/database');
const Product = require('./Product');
const DiningTable = require('./DiningTable');
const Order = require('./Order');
const OrderProduct = require('./OrderProduct');
const TableQrToken = require('./TableQrToken');
const OrderSession = require('./OrderSession');

async function initDB({ alter = false, force = false } = {}) {
  await sequelize.authenticate();
  await sequelize.sync({ alter, force });
  return { sequelize, Product, DiningTable, Order, OrderProduct };
}

module.exports = {
  sequelize,
  Product,
  DiningTable,
  Order,
  OrderProduct,
  TableQrToken,
  OrderSession,
  initDB,
};
