const { StatusCodes } = require('http-status-codes');
const orderService = require('../services/order.service');
const { toDetailDTO } = require('../dtos/order.dto');
const AppError = require('../errors/AppError');

const URGENT_MIN = 15;

function pickAnchor(order) {
  // Sequelize underscored 옵션에 따라 접근 방식이 다를 수 있어 안전하게 getDataValue 사용
  const get = (k) =>
    typeof order.getDataValue === 'function' ? order.getDataValue(k) : order[k];
  return get('started_at') || get('confirmed_at') || get('created_at');
}

function toCardDTO(order, nowMs) {
  const anchor = new Date(pickAnchor(order));
  const ageMin = Math.max(0, Math.floor((nowMs - anchor.getTime()) / 60000));

  // DiningTable 포함: include에 [{ model: DiningTable, attributes: ['label'] }]
  const tableLabel =
    order.DiningTable?.label ??
    (typeof order.get === 'function'
      ? order.get('DiningTable')?.label
      : undefined) ??
    null;

  return {
    id: order.id,
    status: order.status, // 'CONFIRMED' | 'IN_PROGRESS'
    table: tableLabel, // 테이블명
    payer_name: order.payer_name ?? null,
    age_min: ageMin, // 경과 분
    placed_at: anchor.toISOString(), // "n분 전" 표시용
  };
}

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
