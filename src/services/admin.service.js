const { DiningTable } = require('../models');
const hashids = require('../utils/hashids');

const FE_BASE = process.env.FE_BASE_URL || 'http://localhost:8080';

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
