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
    // 사람이 보는 테이블명 (예: "A-10")
    label: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '표시용 테이블명',
    },
    // QR/URL용 내부 식별자 (id 기반 hashids) — 인쇄 QR에는 이 값을 넣음
    slug: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
      comment: 'URL-safe 슬러그',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'dining_tables',
    indexes: [{ unique: true, fields: ['label'] }], // 매장 단일 기준; 다점포면 (venue_id, label)로 변경
  }
);

DiningTable.addHook('beforeValidate', (t) => {
  if (t.label) t.label = String(t.label).trim();
});

// id가 생성된 후 slug를 id→hash로 채움 (label 변경과 무관)
DiningTable.addHook('afterCreate', async (t, options) => {
  if (!t.slug) {
    t.slug = hashids.encode(t.id); // 다점포면 encode([venue_id, t.id]) 등으로 확장
    await t.save({ transaction: options.transaction });
  }
});

module.exports = DiningTable;
