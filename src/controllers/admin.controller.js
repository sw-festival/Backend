const { StatusCodes } = require('http-status-codes');
const adminService = require('../services/admin.service');

exports.ensureTableByLabel = async (req, res, next) => {
  try {
    const { label, active = true } = req.body || {};
    if (!label || typeof label !== 'string') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'label (string) is required',
      });
    }

    const { table, created, slugUrl } = await adminService.ensureTableByLabel({
      label: label.trim(),
      active,
    });

    return res.status(created ? StatusCodes.CREATED : StatusCodes.OK).json({
      success: true,
      message: created
        ? 'created successfully'
        : 'request retrieved successfully',
      data: {
        table: {
          id: table.id,
          label: table.label,
          slug: table.slug,
          is_active: table.is_active,
        },
        qr: { slugUrl },
        created,
      },
    });
  } catch (err) {
    console.error('[ensureTableByLabel]', err);
    next(err);
  }
};

exports.rotateQrToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.rotateQrToken(Number(id));

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'QR token rotated successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const token = await adminService.login(pin);
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: 'Login successfully', token });
  } catch (err) {
    next(err);
  }
};
