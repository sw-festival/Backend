const { StatusCodes } = require('http-status-codes');
const orderService = require('../services/order.service');
const AppError = require('../errors/AppError');

exports.createOrder = async (req, res, next) => {
  try {
    const { order_type = 'DINE_IN', payer_name, items } = req.body;
    const result = await orderService.createOrder({
      session: req.orderSession, // 세션 필수
      order_type,
      payer_name,
      items,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Order created successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// 주문 상태
const ALLOWED_ACTIONS = new Set(['confirm', 'start', 'serve', 'cancel']);

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new AppError(
        `Invalid order id: ${orderId}`,
        StatusCodes.BAD_REQUEST
      );
    }

    const { action, reason } = req.body || {};
    if (!action || !ALLOWED_ACTIONS.has(String(action))) {
      throw new AppError(
        `action required (one of: ${[...ALLOWED_ACTIONS].join(', ')})`,
        StatusCodes.BAD_REQUEST
      );
    }

    const admin = req.admin || null;

    const result = await orderService.updateOrderStatus({
      id: orderId,
      action,
      reason: reason || null,
      admin,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Status updated successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.getActiveOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getActiveOrders();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Active orders retrieved successfully',
      data: orders,
    });
  } catch (err) {
    next(err);
  }
};
