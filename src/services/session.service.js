const crypto = require('crypto');
const AppError = require('../errors/AppError');
const { StatusCodes } = require('http-status-codes');
const { makeRandomToken } = require('../utils/token');
const { withRetry } = require('../utils/retry');
const {
  sequelize,
  DiningTable,
  OrderSession,
  TableQrToken,
} = require('../models');

const ABS = parseInt(process.env.SESSION_ABS_TTL_MIN || '120', 10) * 60 * 1000; // 절대 TTL
const IDLE =
  parseInt(process.env.SESSION_IDLE_TTL_MIN || '120', 10) * 60 * 1000; // 유휴 TTL
const TOKEN_BYTES = parseInt(process.env.SESSION_TOKEN_BYTES || '32', 10);

async function openSessionForTable(table, t) {
  await OrderSession.update(
    {
      status: 'CLOSED',
      active_flag: 0,
      closed_reason: 'NEW_SESSION',
    },
    {
      where: { table_id: table.id, status: 'OPEN', active_flag: 1 },
      transaction: t,
    }
  );

  const session_token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const ses = await OrderSession.create(
    {
      table_id: table.id,
      session_token,
      status: 'OPEN',
      active_flag: 1,
      last_active_at: new Date(),
    },
    { transaction: t }
  );

  return {
    session_token: ses.session_token,
    session_id: ses.id,
    table: { id: table.id, label: table.label, slug: table.slug },
    abs_ttl_min: Math.floor(ABS / 60000),
    idle_ttl_min: Math.floor(IDLE / 60000),
  };
}

exports.openSessionByToken = async (code) => {
  return sequelize.transaction(async (t) => {
    const tokenRec = await TableQrToken.findOne({
      where: { token: code, status: 'ACTIVE' },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!tokenRec) {
      throw new AppError(
        'invalid or revoked token',
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    if (
      tokenRec.expires_at &&
      new Date(tokenRec.expires_at).getTime() < Date.now()
    ) {
      await tokenRec.update({ status: 'EXPIRED' }, { transaction: t });
      throw new AppError('token expired', StatusCodes.UNPROCESSABLE_ENTITY);
    }

    const table = await DiningTable.findByPk(tokenRec.table_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!table || !table.is_active) {
      throw new Error('table not found or inactive', StatusCodes.NOT_FOUND);
    }

    return openSessionForTable(table, t);
  });
};

exports.openBySlugWithCode = async ({ slug, code }) => {
  if (!slug || !code)
    throw new AppError('slug and code required', StatusCodes.BAD_REQUEST);
  const expected = String(process.env.SESSION_OPEN_CODE || '');
  if (!expected)
    throw new AppError(
      'SESSION_OPEN_CODE not configured',
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  if (String(code) !== expected)
    throw new AppError('invalid code', StatusCodes.UNPROCESSABLE_ENTITY);

  return await withRetry(async () => {
    return await sequelize.transaction(async (t) => {
      const table = await DiningTable.findOne({
        where: { slug, is_active: true },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!table)
        throw new AppError(
          'table not found or inactive',
          StatusCodes.NOT_FOUND
        );

      const openRows = await OrderSession.findAll({
        attributes: ['id'],
        where: { table_id: table.id, status: 'OPEN' },
        order: [['id', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const openIds = openRows.map((r) => r.id);
      if (openIds.length) {
        await OrderSession.update(
          { status: 'EXPIRED', active_flag: 0 },
          { where: { id: openIds }, transaction: t }
        );
      }

      const now = new Date();
      const ses = await OrderSession.create(
        {
          table_id: table.id,
          session_token: makeRandomToken(),
          status: 'OPEN',
          visit_started_at: now,
          last_active_at: now,
          active_flag: 1,
        },
        { transaction: t }
      );

      table.current_session_id = ses.id;
      await table.save({ transaction: t });

      return {
        session_id: ses.id,
        session_token: ses.session_token,
        table: { id: table.id, label: table.label, slug: table.slug },
        abs_ttl_min: Number(process.env.SESSION_ABS_TTL_MIN || 120),
        idle_ttl_min: Number(process.env.SESSION_IDLE_TTL_MIN || 30),
      };
    });
  });
};

exports.closeSessionById = async (sessionId) => {
  const ses = await OrderSession.findByPk(sessionId);
  if (!ses) {
    throw new AppError('session not found', StatusCodes.NOT_FOUND);
  }

  if (ses.status !== 'OPEN') {
    throw new AppError('session is already not opened', StatusCodes.CONFLICT);
  }

  await ses.update({
    status: 'CLOSED',
    active_flag: 0,
    closed_reason: 'STAFF_CLOSED',
  });

  return { ok: true };
};
