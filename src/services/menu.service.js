const { Product } = require('../models');

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
