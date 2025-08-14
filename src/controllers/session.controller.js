const { StatusCodes } = require('http-status-codes');
const AppError = require('../errors/AppError');
const sessionService = require('../services/session.service');

exports.openSessionByToken = async (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      throw new AppError('code(string) is required', StatusCodes.BAD_REQUEST);
    }

    const out = await sessionService.openSessionByToken(code.trim());
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'session opened',
      data: out,
    });
  } catch (err) {
    next(err);
  }
};

exports.closeSessionById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new AppError('invalid session id', StatusCodes.BAD_REQUEST);
    }

    await sessionService.closeSessionById(id);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'session closed successfully',
    });
  } catch (err) {
    next(err);
  }
};
