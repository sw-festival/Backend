const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const sessionAuth = require('../middlewares/sessionAuth');
const adminAuth = require('../middlewares/adminAuth');

router.post('/', sessionAuth, orderController.createOrder);

router.patch('/:id/status', adminAuth, orderController.updateOrderStatus);

router.get('/active', adminAuth, orderController.getOrdersForKitchen);

module.exports = router;
