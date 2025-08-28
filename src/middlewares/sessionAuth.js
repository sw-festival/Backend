// src/middlewares/sessionAuth.js
const { StatusCodes } = require('http-status-codes');
const { OrderSession, DiningTable } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const token =
      req.headers['x-session-token'] ||
      (req.headers.authorization || '').replace(/^Session\s+/i, '');

    if (!token) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ success: false, message: 'No session token' });
    }

    const ses = await OrderSession.findOne({
      where: { session_token: token, status: 'OPEN' },
    });
    if (!ses) {
      return res
        .status(StatusCodes.UNPROCESSABLE_ENTITY)
        .json({ success: false, message: 'Invalid or closed session' });
    }

    // 현재 테이블의 활성 세션인지 확인 (예전 토큰 차단 핵심)
    const table = await DiningTable.findByPk(ses.table_id, {
      attributes: ['id', 'current_session_id'],
    });
    if (!table || table.current_session_id !== ses.id) {
      return res
        .status(StatusCodes.UNPROCESSABLE_ENTITY)
        .json({ success: false, message: 'session superseded' });
    }

    // TTL 체크 (있으면)
    const now = Date.now();
    const createdAt = ses.createdAt?.getTime?.() ?? now;
    const lastActive = ses.last_active_at?.getTime?.() ?? createdAt;
    const absTTL = Number(process.env.SESSION_ABS_TTL_MIN || 120) * 60 * 1000;
    const idleTTL = Number(process.env.SESSION_IDLE_TTL_MIN || 30) * 60 * 1000;

    if (now - createdAt > absTTL || now - lastActive > idleTTL) {
      await ses.update({ status: 'EXPIRED', active_flag: 0 });
      return res
        .status(StatusCodes.UNPROCESSABLE_ENTITY)
        .json({ success: false, message: 'token expired' });
    }

    await ses.update({ last_active_at: new Date() });
    req.orderSession = ses;
    next();
  } catch (err) {
    next(err);
  }
};
