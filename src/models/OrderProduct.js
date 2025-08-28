// src/models/OrderProduct.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const OrderProduct = sequelize.define(
  'OrderProduct',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE',
    },

    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE',
    },

    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1 },
    },
    unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    line_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  },
  {
    tableName: 'order_products',
    indexes: [
      { name: 'idx_order_products_order', fields: ['order_id'] },
      { name: 'idx_order_products_product', fields: ['product_id'] },
      // { name: 'uq_order_products_order_product', unique: true, fields: ['order_id', 'product_id'] },
    ],
    hooks: {
      beforeValidate(item) {
        const q = Number(item.quantity || 0);
        const p = Number(item.unit_price || 0);
        item.line_total = (q * p).toFixed(2);
      },
    },
  }
);

module.exports = OrderProduct;
