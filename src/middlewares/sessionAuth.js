const { StatusCodes } = require('http-status-codes');
const OrderSession = require('../models/OrderSession');
const { NUMBER } = require('sequelize');

module.exports = async (req, res, next) => {
  const h =
    req.headers['x-session-token'] ||
    (req.headers.authorization || '').replace(/^Session\s+/i, '');

  if (!h) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'No session token',
    });
  }

  const ses = await OrderSession.findOne({
    where: { session_token: h, status: 'OPEN' },
  });

  if (!ses)
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: 'Invalid or closed session',
    });

  const now = new Date();
  const absTTL = NUMBER(process.env.SESSION_ABS_TTL_MIN || 120);
  const idleTTL = NUMBER(process.env.SESSION_IDLE_TTL_MIN || 30);
  const createdAt = s.createdAt || s.getDataValue('createdAt');
  const lastActive = s.last_active_at || createdAt;

  const ms = (m) => m * 60 * 1000;
  if (now - createdAt > ms(absTTL)) {
    ses.status = 'EXPIRED';
    ses.active_flag = 0;
    await ses.save();
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: 'Token expired',
    });
  }
  if (now - lastActive > ms(idleTTL)) {
    ses.status = 'EXPIRED';
    ses.active_flag = 0;
    await ses.save();
    return res.status(422).json({ success: false, message: 'Token expired' });
  }

  req.orderSession = ses;
  ses.last_active_at = now;
  await ses.save();
  next();
};
