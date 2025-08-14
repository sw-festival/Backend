const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');

router.post('/tables/ensure', adminController.ensureTableByLabel);

router.post('/tables/:id/qr/update', adminController.rotateQrToken);

module.exports = router;
