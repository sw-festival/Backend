const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');

// router.post('/resolve', sessionController.openSessionByToken); deprecated

router.post('/open-by-slug', sessionController.openBySlugWithCode);

router.post('/:id/close', sessionController.closeSessionById);

module.exports = router;
