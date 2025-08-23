// utils/token.js
const crypto = require('crypto');

/**
 * 랜덤 세션 토큰 생성
 * @param {number} len - 바이트 길이 (기본 32 → hex 64자리)
 */
function makeRandomToken(len = 32) {
  return crypto.randomBytes(len).toString('hex');
}

module.exports = { makeRandomToken };
