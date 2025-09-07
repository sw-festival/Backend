// src/routes/sse.route.js
const express = require('express');
const adminAuth = require('../middlewares/adminAuth'); // 기존 JWT 검증
const sseController = require('../controllers/sse.controller');

const router = express.Router();

/**
 * 관리자 실시간 주문 스트림
 * GET /api/admin/orders/stream
 */
router.get('/orders/stream', adminAuth, sseController.streamAdminOrders);

module.exports = router;
