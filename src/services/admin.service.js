const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const { sequelize, DiningTable, TableQrToken } = require('../models');
const AppError = require('../errors/AppError');
const hashids = require('../utils/hashids');

const FE_BASE = (process.env.FE_BASE_URL || 'http://localhost:8080').replace(
  /\/+$/,
  ''
);
exports.ensureTableByLabel = async ({ label, active }) => {
  try {
    const [table, created] = await DiningTable.findOrCreate({
      where: { label },
      defaults: { is_active: !!active },
    });

    if (!table.slug) {
      table.slug = hashids.encode(table.id);
      await table.save();
    }

    const slugUrl = `${FE_BASE.replace(/\/+$/, '')}/t/${table.slug}`;

    return { table, created, slugUrl };
  } catch (err) {
    throw err;
  }
};

exports.rotateQrToken = async (tableId, { ttlMin = null } = {}) => {
  return sequelize.transaction(async (t) => {
    // 1) 테이블 확인 + 잠금(동시 갱신 방지)
    const table = await DiningTable.findByPk(tableId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!table)
      throw new AppError(
        `Table with id ${tableId} not found`,
        StatusCodes.NOT_FOUND
      );

    // 2) slug도 새로 회전(원하면 유지해도 되지만 회전과 보안 레벨을 맞추려면 갱신 권장)
    table.slug = hashids.encode(table.id, Date.now());
    await table.save({ transaction: t });

    // 3) 기존 ACTIVE 토큰 REVOKE
    await TableQrToken.update(
      { status: 'REVOKED', revoked_at: new Date() },
      { where: { table_id: table.id, status: 'ACTIVE' }, transaction: t }
    );

    // 4) 신규 토큰 발급(+ 만료 시간)
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = ttlMin ? new Date(Date.now() + ttlMin * 60000) : null;

    const rec = await TableQrToken.create(
      { table_id: table.id, token, status: 'ACTIVE', expires_at },
      { transaction: t }
    );

    // 5) FE가 스캔할 URL (token 방식)
    const tokenUrl = `${FE_BASE}/t?code=${rec.token}`;

    return {
      table: {
        id: table.id,
        label: table.label,
        slug: table.slug,
        is_active: table.is_active,
      },
      qr: { tokenUrl, slugUrl: `${FE_BASE}/t/${table.slug}` },
      token: rec.token,
      expires_at,
    };
  });
};

exports.login = async (pin) => {
  if (!pin) {
    throw AppError('PIN is required', StatusCodes.BAD_REQUEST);
  }

  if (pin !== process.env.ADMIN_PIN) {
    throw AppError('Invalid PIN', StatusCodes.UNAUTHORIZED);
  }

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

  return token;
};
