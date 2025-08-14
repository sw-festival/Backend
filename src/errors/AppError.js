// src/errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // 운영상 에러(예측 가능) 플래그
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
