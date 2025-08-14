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
      references: {
        model: 'orders', // 참조 테이블명
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'products', // 참조 테이블명
        key: 'id',
      },
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
      { fields: ['order_id'] },
      { fields: ['product_id'] },
      // 중복 라인 방지하려면 다음을 활성화
      // { unique: true, fields: ['order_id', 'product_id'] },
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
