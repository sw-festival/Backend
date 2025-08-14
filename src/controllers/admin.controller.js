const { StatusCodes } = require('http-status-codes');
const adminService = require('../services/admin.service');

exports.ensureTableByLabel = async (req, res) => {
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
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  }
};
