// src/models/OrderSession.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const OrderSession = sequelize.define(
  'OrderSession',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    table_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    token_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },

    // 🔴 여기! unique: true 삭제
    session_token: { type: DataTypes.STRING(128), allowNull: false },

    status: {
      type: DataTypes.ENUM('OPEN', 'CLOSED', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    visit_started_at: { type: DataTypes.DATE, allowNull: true },
    order_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    last_active_at: { type: DataTypes.DATE, allowNull: true },
    active_flag: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    closed_reason: { type: DataTypes.STRING(64), allowNull: true },
  },
  {
    tableName: 'order_sessions',
    indexes: [
      // ✅ 이름 있는 유니크 인덱스만 유지
      {
        name: 'uq_order_sessions_session_token',
        unique: true,
        fields: ['session_token'],
      },

      // 운영 정책에 따라 유지
      {
        name: 'order_sessions_table_id_status',
        fields: ['table_id', 'status'],
      },

      // token_id 단일 인덱스가 필요하면 명시
      { name: 'idx_order_sessions_token_id', fields: ['token_id'] },

      // 테이블 당 OPEN 1개 강제하고 싶으면 아래 주석 해제(데이터 정리 필요)
      // { name: 'uq_order_sessions_table_active', unique: true, fields: ['table_id', 'active_flag'] },
    ],
  }
);

module.exports = OrderSession;
