const { StatusCodes } = require('http-status-codes');
const orderService = require('../services/order.service');

exports.createOrder = async (req, res, next) => {
  try {
    const { order_type = 'DINE_IN', payer_name, items } = req.body;
    const result = await orderService.create({
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
