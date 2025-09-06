const { StatusCodes } = require('http-status-codes');

const menuService = require('../services/menu.service');

exports.getMenuPublic = async (req, res, next) => {
  try {
    const menus = await menuService.getAllMenu({ public: true });
    if (!menus)
      return res.status(StatusCodes.NOT_FOUND).message({
        success: false,
        message: 'menus are not found',
      });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'menu returned successfully',
      data: menus,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMenuAdmin = async (req, res, next) => {
  try {
    const menus = await menuService.getAllMenu({ public: false });
    if (!menus)
      return res.status(StatusCodes.NOT_FOUND).message({
        success: false,
        message: 'menus are not found',
      });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'menu returned successfully',
      data: menus,
    });
  } catch (err) {
    next(err);
  }
};
