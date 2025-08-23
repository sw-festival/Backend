// src/models/TableQrToken.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const TableQrToken = sequelize.define(
  'TableQrToken',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    table_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },

    // ❌ 컬럼에 unique 금지: named index로만 관리
    token: { type: DataTypes.STRING(128), allowNull: false },

    status: {
      type: DataTypes.ENUM('ACTIVE', 'REVOKED', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },

    expires_at: { type: DataTypes.DATE, allowNull: true },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'table_qr_tokens',
    indexes: [
      { name: 'uq_table_qr_tokens_token', unique: true, fields: ['token'] },
      {
        name: 'idx_table_qr_tokens_table_status',
        fields: ['table_id', 'status'],
      },
    ],
  }
);

module.exports = TableQrToken;
