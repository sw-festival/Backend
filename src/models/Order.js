// src/models/Order.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    order_session_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: '주문이 생성된 OrderSession',
    },

    table_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: '주문 시점의 테이블',
    },

    payer_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '입금자명',
    },

    order_type: {
      type: DataTypes.ENUM('DINE_IN', 'TAKEOUT'),
      allowNull: false,
      defaultValue: 'DINE_IN',
      comment: '주문 유형(매장/포장)',
    },

    // + 세션 내 순번
    order_seq: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: '세션 내 n번째 주문(1부터 시작)',
    },

    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'CONFIRMED',
        'IN_PROGRESS',
        'SERVED',
        'CANCELED'
      ),
      allowNull: false,
      defaultValue: 'PENDING',
    },

    subtotal_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discount_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '주문총액',
    },
    discount_reason: { type: DataTypes.STRING(64), allowNull: true }, // ex) TAKEOUT_10_OFF
  },
  {
    tableName: 'orders',
    indexes: [
      { name: 'idx_orders_order_session_id', fields: ['order_session_id'] },
      { name: 'idx_orders_table_id', fields: ['table_id'] },
      { name: 'idx_orders_status', fields: ['status'] },
      // 세션 내 순번 유일 보장
      // {
      //   name: 'uq_orders_session_seq',
      //   unique: true,
      //   fields: ['order_session_id', 'order_seq'],
      // },
    ],
  }
);

module.exports = Order;
