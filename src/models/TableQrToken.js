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
    token: { type: DataTypes.STRING(128), allowNull: false, unique: true },
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
      { unique: true, fields: ['token'] },
      { fields: ['table_id', 'status'] },
    ],
  }
);

module.exports = TableQrToken;
