const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const sessionAuth = require('../middlewares/sessionAuth');

router.post('/', sessionAuth, orderController.createOrder);

module.exports = router;
