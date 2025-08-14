const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
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
    tableName: 'order_items',
    hooks: {
      beforeValidate(item) {
        const q = Number(item.quantity || 0);
        const p = Number(item.unit_price || 0);
        item.line_total = (q * p).toFixed(2);
      },
    },
  }
);

module.exports = OrderItem;
