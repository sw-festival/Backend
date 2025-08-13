const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    timezone: '+09:00',
    define: {
      underscored: true, // created_at 등 스네이크 케이스
      freezeTableName: false, // 복수형 자동화 비활성화 원하면 true
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      paranoid: true, // deleted_at(소프트 삭제)
      timestamps: true, // created_at, updated_at
    },
  }
);

module.exports = sequelize;
