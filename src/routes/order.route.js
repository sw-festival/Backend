const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const sessionAuth = require('../middlewares/sessionAuth');
const adminAuth = require('../middlewares/adminAuth');

router.post('/', sessionAuth, orderController.createOrder);

// 사용자: 내 주문 목록 (세션 토큰 필요)
router.get('/', sessionAuth, orderController.listMyOrders);

// 관리자: 전체 주문 목록 (관리자 JWT)
router.get('/admin', adminAuth, orderController.listAllOrders);

router.patch('/:id/status', adminAuth, orderController.updateOrderStatus);

router.get('/active', adminAuth, orderController.getActiveOrders);

router.get('/:id', sessionAuth, orderController.getOrderDetail);

router.get('/admin/:id', adminAuth, orderController.getOrderDetailAdmin);

module.exports = router;
