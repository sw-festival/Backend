// src/models/DiningTable.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const hashids = require('../utils/hashids');

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
      comment: '표시용 테이블명',
    },
    slug: {
      type: DataTypes.STRING(64),
      allowNull: true,
      // ❌ unique: true  <-- 인라인 유니크 제거
      comment: 'URL-safe 슬러그',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    current_session_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: '현재 테이블의 활성 세션 (이전 토큰 차단용)',
    },
  },
  {
    tableName: 'dining_tables',
    indexes: [
      // ✅ 인덱스는 '이름을 지정'해서 단일화
      { name: 'uq_dining_tables_label', unique: true, fields: ['label'] },
      { name: 'uq_dining_tables_slug', unique: true, fields: ['slug'] },
      {
        name: 'idx_dining_tables_current_session_id',
        fields: ['current_session_id'],
      },
    ],
  }
);

DiningTable.addHook('beforeValidate', (t) => {
  if (t.label) t.label = String(t.label).trim();
});

DiningTable.addHook('afterCreate', async (t, options) => {
  if (!t.slug) {
    t.slug = hashids.encode(t.id);
    await t.save({ transaction: options.transaction });
  }
});

module.exports = DiningTable;
