const express= require('express');
const menuController = require('../controllers/menu.controller');
const adminAuth = require('../middlewares/adminAuth');

const router = express.Router();

router.get('/', menuController.getMenuPublic);

router.get('/admin', adminAuth, menuController.getMenuAdmin);

module.exports = router;
