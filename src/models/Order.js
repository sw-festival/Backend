const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    payer_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '입금자명',
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
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '주문총액',
    },
  },
  {
    tableName: 'orders',
  }
);

module.exports = Order;
