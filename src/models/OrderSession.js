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
    token_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true }, // 회전 토큰과 연결(선택)
    session_token: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM('OPEN', 'CLOSED', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'OPEN',
    },

    // 방문 시작 시각(세션 생성 시 기록)
    visit_started_at: { type: DataTypes.DATE, allowNull: true },

    last_active_at: { type: DataTypes.DATE, allowNull: true },
    // 동시 스캔 방지: OPEN=1, CLOSED/EXPIRED=0 → (table_id, active_flag) UNIQUE
    active_flag: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    closed_reason: { type: DataTypes.STRING(64), allowNull: true },
  },
  {
    tableName: 'order_sessions',
    indexes: [
      { unique: true, fields: ['session_token'] },
      // { unique: true, fields: ['table_id', 'active_flag'] }, // 테이블당 OPEN 1개 보장
      { fields: ['table_id', 'status'] },
    ],
  }
);

module.exports = OrderSession;
