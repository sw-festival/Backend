const sequelize = require('../../config/database');

const Product = require('./Product');
const DiningTable = require('./DiningTable');
const Order = require('./Order');
const OrderProduct = require('./OrderProduct');

const OrderSession = require('./OrderSession');
const TableQrToken = require('./TableQrToken');

// ------------ Associations ------------

// 주문 ←→ 테이블
Order.belongsTo(DiningTable, {
  foreignKey: { name: 'table_id', allowNull: false },
});
DiningTable.hasMany(Order, { foreignKey: 'table_id' });

// 주문 ←→ 라인아이템
Order.hasMany(OrderProduct, {
  as: 'items',
  foreignKey: { name: 'order_id', allowNull: false },
});
OrderProduct.belongsTo(Order, {
  foreignKey: { name: 'order_id', allowNull: false },
  onDelete: 'CASCADE',
  hooks: true,
});

// 라인아이템 ←→ 상품
OrderProduct.belongsTo(Product, {
  foreignKey: { name: 'product_id', allowNull: false },
});
Product.hasMany(OrderProduct, { foreignKey: 'product_id' });

// 세션/토큰 ←→ 테이블
OrderSession.belongsTo(DiningTable, {
  foreignKey: { name: 'table_id', allowNull: false },
});
DiningTable.hasMany(OrderSession, { foreignKey: 'table_id' });

TableQrToken.belongsTo(DiningTable, {
  foreignKey: { name: 'table_id', allowNull: false },
});
DiningTable.hasMany(TableQrToken, { foreignKey: 'table_id' });

// 세션 ←→ 회전 토큰(선택)
OrderSession.belongsTo(TableQrToken, {
  foreignKey: { name: 'token_id', allowNull: true },
});
TableQrToken.hasMany(OrderSession, { foreignKey: 'token_id' });

// ------------ Init ------------
async function initDB({ alter = false, force = false } = {}) {
  await sequelize.authenticate();
  await sequelize.sync({ alter, force });
  return {
    sequelize,
    Product,
    DiningTable,
    Order,
    OrderProduct,
    OrderSession,
    TableQrToken,
  };
}

module.exports = {
  sequelize,
  Product,
  DiningTable,
  Order,
  OrderProduct,
  OrderSession,
  TableQrToken,
  initDB,
};
