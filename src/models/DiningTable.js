// models/DiningTable.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DiningTable = sequelize.define(
  'DiningTable',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    label: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '표시값(예: "1", "A-3")',
    },
    slug: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
      comment: 'QR에 쓰는 고정 식별자',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  { tableName: 'dining_tables', indexes: [{ unique: true, fields: ['slug'] }] }
);

module.exports = DiningTable;
