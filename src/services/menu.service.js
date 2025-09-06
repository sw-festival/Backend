const { Product, Order, OrderProduct } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

exports.getAllMenu = async ({ public: isPublic } = {}) => {
  try {
    const attrs = isPublic
      ? ['id', 'name', 'price', 'image_url', 'description', 'stock'] // stock 포함
      : ['id', 'name', 'price', 'image_url', 'description', 'stock'];

    const menus = await Product.findAll({ attributes: attrs });

    return menus.map((m) => {
      const json = m.toJSON();
      if (isPublic) {
        // public이면 stock은 숨기기
        delete json.stock;
      }
      return {
        ...json,
        is_sold_out: m.stock <= 0,
      };
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// KST(UTC+9) 기준 "오늘" 경계 계산 → DB는 보통 UTC 저장이므로 UTC로 보정해서 바인딩
function getTodayUtcRangeForKst() {
  const now = new Date();
  // KST '오늘'의 00:00:00
  const kstStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  );
  // KST '내일' 00:00:00
  const kstEnd = new Date(kstStart.getTime() + 24 * 60 * 60 * 1000);

  const KST_OFFSET_MIN = 9 * 60;
  const toUtc = (d) => new Date(d.getTime() - KST_OFFSET_MIN * 60 * 1000);

  return { startUtc: toUtc(kstStart), endUtc: toUtc(kstEnd) };
}

exports.getPopularMenu = async ({ count }) => {
  try {
    const limit = Number(count) > 0 ? Number(count) : 3;

    const { startUtc, endUtc } = getTodayUtcRangeForKst();

    const rows = await OrderProduct.findAll({
      attributes: [
        'product_id',
        [fn('SUM', col('quantity')), 'qty_sold'],
        [fn('SUM', col('line_total')), 'amount_sold'],
      ],
      include: [
        {
          model: Order,
          attributes: [],
          required: true,
          where: {
            status: { [Op.in]: ['CONFIRMED', 'IN_PROGRESS', 'SERVED'] },
            created_at: {
              [Op.lt]: endUtc,
            },
          },
        },
        {
          model: Product,
          attributes: ['id', 'name', 'image_url', 'description'],
          required: true,
          where: { type: ['MAIN', 'SIDE'] },
        },
      ],
      group: [
        'Product.id',
        'Product.name',
        'Product.image_url',
        'Product.description',
      ],
      order: [[literal('qty_sold'), 'DESC']],
      limit,
      raw: true,
    });

    return rows.map((r) => ({
      id: r['Product.id'],
      name: r['Product.name'],
      image_url: r['Product.image_url'],
      description: r['Product.description'],
      qty_sold: Number(r.qty_sold) || 0,
      amount_sold: Number(r.amount_sold) || 0,
    }));
  } catch (err) {
    console.error(err);
    throw err;
  }
};
