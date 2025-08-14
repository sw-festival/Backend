const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');

router.post('/resolve', sessionController.openSessionByToken);

module.exports = router;
