const { StatusCodes } = require('http-status-codes');
const OrderSession = require('../models/OrderSession');

module.exports = async (req, res, next) => {
  try {
    // 토큰 추출: X-Session-Token 우선, 없으면 Authorization 지원
    const raw =
      req.headers['x-session-token'] || req.headers.authorization || '';
    let token = raw.trim();

    // Authorization: Session <token> 패턴만 처리 (필요시 Bearer 등 추가)
    if (/^Session\s+/i.test(token))
      token = token.replace(/^Session\s+/i, '').trim();

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'No session token',
      });
    }

    const ses = await OrderSession.findOne({
      where: { session_token: token, status: 'OPEN' },
    });
    if (!ses) {
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'invalid or closed session',
      });
    }

    // TTL 검사
    const now = new Date();
    const absTTL = Number(process.env.SESSION_ABS_TTL_MIN || 120);
    const idleTTL = Number(process.env.SESSION_IDLE_TTL_MIN || 30);

    const createdAt = ses.createdAt || ses.getDataValue('createdAt');
    const lastActive = ses.last_active_at || createdAt;

    const ms = (m) => m * 60 * 1000;
    if (now - createdAt > ms(absTTL) || now - lastActive > ms(idleTTL)) {
      ses.status = 'EXPIRED';
      ses.active_flag = 0;
      await ses.save();
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'token expired',
      });
    }

    // 통과: 활동 갱신
    ses.last_active_at = now;
    await ses.save();

    req.orderSession = ses;
    next();
  } catch (err) {
    next(err);
  }
};
