const { StatusCodes } = require('http-status-codes');
const orderService = require('../services/order.service');
const { toDetailDTO, toCardDTO } = require('../dtos/order.dto');
const AppError = require('../errors/AppError');

const URGENT_MIN = 15;

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
    const nowMs = Date.now();
    const rows = await orderService.getActiveOrders();

    const urgent = [],
      waiting = [],
      preparing = [];
    for (const o of rows) {
      const card = toCardDTO(o, nowMs);
      const isUrgent = card.age_min >= URGENT_MIN;
      if (isUrgent) urgent.push(card);
      else if (card.status === 'CONFIRMED') waiting.push(card);
      else preparing.push(card);
    }

    const byOldest = (a, b) => b.age_min - a.age_min;
    urgent.sort(byOldest);
    waiting.sort(byOldest);
    preparing.sort(byOldest);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Active orders retrieved successfully',
      data: { urgent, waiting, preparing },
      meta: {
        now: new Date(nowMs).toISOString(),
        threshold_min: URGENT_MIN,
        counts: {
          urgent: urgent.length,
          waiting: waiting.length,
          preparing: preparing.length,
        },
        total: urgent.length + waiting.length + preparing.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrderDetail = async (req, res, next) => {
  try {
    const id = req.params.id;
    const details = await orderService.getOrderDetail(id);
    if (!details)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: 'order not found' });
    if (details.order_session_id !== req.orderSession.id) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'forbidden',
      });
    }
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'order details retrieved successfully',
      data: toDetailDTO(details),
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrderDetailAdmin = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const details = await orderService.getOrderDetail(id);
    if (!details)
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'order not found',
      });
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'order details retrieved successfully',
      data: toDetailDTO(details),
    });
  } catch (err) {
    next(err);
  }
};

function parseLimit(q) {
  return Math.max(1, Math.min(parseInt(q?.limit ?? '20', 10) || 20, 100));
}


exports.listMyOrders = async (req, res, next) => {
  try {
    const { after, before, status, order_type, table_slug, from, to } = req.query || {};
    if (after && before) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false, message: 'Use either after or before, not both',
      });
    }

    const limit = parseLimit(req.query);
    const sessionId = req.orderSession?.id; // sessionAuth에서 세팅됨

    const result = await orderService.listOrders({
      limit,
      after,
      before,
      filters: { status, order_type, table_slug, from, to },
      scope: { sessionId }, // 본인 세션으로 제한
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'orders listed',
      data: result,
    });
  } catch (err) { next(err); }
};

exports.listAllOrders = async (req, res, next) => {
  try {
    const { after, before, status, order_type, table_slug, from, to } = req.query || {};
    if (after && before) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false, message: 'Use either after or before, not both',
      });
    }

    const limit = parseLimit(req.query);

    const result = await orderService.listOrders({
      limit,
      after,
      before,
      filters: { status, order_type, table_slug, from, to },
      scope: { /* admin: no session restriction */ },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'orders listed (admin)',
      data: result,
    });
  } catch (err) { next(err); }
};
