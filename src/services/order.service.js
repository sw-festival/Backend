const { StatusCodes } = require('http-status-codes');
const AppError = require('../errors/AppError');
const {
  sequelize,
  Order,
  OrderProduct,
  Product,
  OrderSession,
} = require('../models');
const { withRetry } = require('../utils/retry');

exports.createOrder = async ({ session, order_type, payer_name, items }) => {
  if (!session)
    throw new AppError('Session required', StatusCodes.UNAUTHORIZED);
  if (!Array.isArray(items) || items.length === 0)
    throw new AppError('items required', StatusCodes.BAD_REQUEST);

  return await withRetry(async () => {
    return await sequelize.transaction(async (t) => {
      const [upRes] = await sequelize.query(
        `
        UPDATE order_sessions
           SET order_count = order_count + 1,
               visit_started_at = IFNULL(visit_started_at, NOW()),
               last_active_at   = NOW()
         WHERE id = ?
           AND status = 'OPEN'
      `,
        { replacements: [session.id], transaction: t }
      );

      const affected =
        typeof upRes?.affectedRows === 'number'
          ? upRes.affectedRows
          : typeof upRes === 'number'
            ? upRes
            : 0;
      if (!affected)
        throw new AppError(
          'Invalid or closed session',
          StatusCodes.UNPROCESSABLE_ENTITY
        );

      const [[sesRow]] = await sequelize.query(
        `
        SELECT id, table_id, order_count, visit_started_at
          FROM order_sessions
         WHERE id = ?
         FOR UPDATE
      `,
        { replacements: [session.id], transaction: t }
      );

      const nextSeq = Number(sesRow.order_count);
      const tableId = Number(sesRow.table_id);
      const firstOrderAt = sesRow.visit_started_at
        ? new Date(sesRow.visit_started_at)
        : new Date();

      let subtotal = 0;
      const lines = [];
      for (const it of items) {
        const p = await Product.findOne({
          where: { id: it.product_id, is_active: true },
          transaction: t,
        });
        if (!p)
          throw new AppError(
            `invalid product: ${it.product_id}`,
            StatusCodes.BAD_REQUEST
          );
        const qty = Number(it.quantity || 0);
        if (qty < 1)
          throw new AppError('quantity >= 1', StatusCodes.BAD_REQUEST);
        const unit = Number(p.price);
        const line = Number((unit * qty).toFixed(2));
        subtotal = Number((subtotal + line).toFixed(2));
        lines.push({
          product_id: p.id,
          quantity: qty,
          unit_price: unit,
          line_total: line,
        });
      }

      let discount = 0,
        reason = null;
      if (order_type === 'TAKEOUT') {
        discount = Number((subtotal * 0.1).toFixed(2));
        reason = 'TAKEOUT_10_OFF';
      }
      const total = Number((subtotal - discount).toFixed(2));

      const order = await Order.create(
        {
          order_session_id: session.id,
          table_id: tableId,
          order_seq: nextSeq, // ← 중요
          payer_name: payer_name || null,
          order_type: order_type || 'DINE_IN',
          status: 'PENDING',
          subtotal_amount: subtotal,
          discount_amount: discount,
          total_amount: total,
          discount_reason: reason,
        },
        { transaction: t }
      );

      for (const L of lines) {
        await OrderProduct.create(
          { order_id: order.id, ...L },
          { transaction: t }
        );
      }

      return {
        order_id: order.id,
        order_seq: order.order_seq,
        order_type: order.order_type,
        status: order.status,
        subtotal_amount: order.subtotal_amount,
        discount_amount: order.discount_amount,
        total_amount: order.total_amount,
        first_order_at: firstOrderAt,
      };
    });
  });
};

// 유한 상태 머신
const ALLOWED = {
  PENDING: { confirm: 'CONFIRMED', cancel: 'CANCELED' },
  CONFIRMED: { start: 'IN_PROGRESS', cancel: 'CANCELED' },
  IN_PROGRESS: { serve: 'SERVED' },
  SERVED: {},
  CANCELED: {},
};

exports.updateOrderStatus = async ({ id, action, reason, admin }) => {
  if (!action) throw new AppError('action required', StatusCodes.BAD_REQUEST);

  return await sequelize.transaction(async (t) => {
    const order = await Order.findByPk(id, {
      include: [{ model: OrderProduct, as: 'items' }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw new AppError('order not found', StatusCodes.NOT_FOUND);
    }

    const next = ALLOWED[order.status]?.[action];
    if (!next) {
      throw new AppError(
        `invalid transition: ${order.status} -> (${action})`,
        StatusCodes.CONFLICT
      );
    }

    if (order.status === 'PENDING' && action === 'confirm') {
      for (const it of order.items) {
        const [affected] = await Product.update(
          { stock: literal(`stock - ${it.quantity}`) },
          {
            where: { id: it.product_id, stock: { [Op.gte]: it.quantity } },
            transaction: t,
          }
        );
        if (!affected) throw new AppError('out of stock', StatusCodes.CONFLICT);
      }
    }

    if (order.status === 'CONFIRMED' && action === 'cancel') {
      for (const it of order.items) {
        await Product.update(
          { stock: literal(`stock + ${it.quantity}`) },
          { where: { id: it.product_id }, transaction: t }
        );
      }
    }

    const prev = order.status;
    order.status = next;

    await order.save({ transaction: t });

    return { order_id: id, prev, next };
  });
};
