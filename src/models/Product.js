const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Product = sequelize.define(
  'Product',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,

      comment: '메뉴명',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
      comment: '가격',
    },
    image_url: {
      type: DataTypes.STRING(2048),
      allowNull: true,
      comment: '이미지 URL',
    },
    stock: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
      comment: '재고 수량',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '판매 여부',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '설명',
    },
  },
  {
    tableName: 'products',
    indexes: [
      { name: 'uq_products_name', unique: true, fields: ['name'] },
      { name: 'idx_products_is_active', fields: ['is_active'] },
    ],
  }
);

module.exports = Product;
