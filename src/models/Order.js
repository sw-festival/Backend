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

    // 세션 스냅샷 (필수)
    order_session_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: '주문이 생성된 OrderSession',
    },

    // 테이블 스냅샷 (기존 운영 편의 때문에 유지, 세션과 동일하게 세팅)
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
    status: {
      type: DataTypes.ENUM(
        'PENDING', // 입금 대기
        'CONFIRMED', // 입금 확인 후 주문 수락
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
      { fields: ['order_session_id'] },
      { fields: ['table_id'] },
      { fields: ['order_type'] },
      { fields: ['status'] },
    ],
  }
);

module.exports = Order;
