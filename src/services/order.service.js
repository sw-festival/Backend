const { StatusCodes } = require('http-status-codes');
const AppError = require('../errors/AppError');
const { sequelize, Order, OrderProduct, Product } = require('../models');

exports.createOrder = async ({ session, order_type, payer_name, items }) => {
  if (!session)
    throw new AppError('Session required', StatusCodes.UNAUTHORIZED);
  if (!Array.isArray(items) || items.length === 0)
    throw new AppError('items required', StatusCodes.BAD_REQUEST);

  return await sequelize.transaction(async (t) => {
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
      if (qty < 1) throw new AppError('quantity >= 1', StatusCodes.BAD_REQUEST);

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

    // TAKEOUT 10% 할인
    let discount = 0;
    let reason = null;
    if (order_type === 'TAKEOUT') {
      discount = Number((subtotal * 0.1).toFixed(2));
      reason = 'TAKEOUT_10_OFF';
    }
    const total = Number((subtotal - discount).toFixed(2));

    // 세션/테이블 스냅샷 저장 (설계상 필수)
    const order = await Order.create(
      {
        order_session_id: session.id,
        table_id: session.table_id,

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
      order_type: order.order_type,
      status: order.status,
      subtotal_amount: order.subtotal_amount,
      discount_amount: order.discount_amount,
      total_amount: order.total_amount,
    };
  });
};
