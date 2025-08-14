const { StatusCodes } = require('http-status-codes');
const orderService = require('../services/order.service');

exports.createOrder = async (req, res, next) => {
  try {
    const { payer_name, items } = req.body;
    const result = await orderService.createOrder({
      session: req.orderSession,
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
