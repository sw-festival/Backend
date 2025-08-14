const { DiningTable } = require('../models');
const hashids = require('../utils/hashids');

const FE_BASE =
  process.env.FE_BASE_URL || 'http://localhost:8080'.replace(/\/+$/, '');

exports.ensureTableByLabel = async ({ label, active }) => {
  try {
    const [table, created] = await DiningTable.findOrCreate({
      where: { label },
      defaults: { is_active: active },
    });

    if (!table.slug) {
      table.slug = hashids.encode(table.id);
      await table.save();
    }

    const slugUrl = `${FE_BASE.replace(/\/+$/, '')}/t/${table.slug}`;

    return { table, created, slugUrl };
  } catch (err) {
    throw err;
  }
};

exports.rotateQrToken = async (tableId) => {
  const table = await DiningTable.findByPk(tableId);

  if (!table) {
  }

  table.slug = hashids.encode(table.id, Date.now());
  await table.save();

  const slugUrl = `${FE_BASE}/t/${table.slug}`;

  return { table, qr: { slugUrl } };
};
