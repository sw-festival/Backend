const { Product } = require('../models/index');

exports.spreadMenu = async function spreadMenu({ productId }) {
  const product = await Product.findByPk(productId, { raw: true });
  if (!product) return [];

  // 세트가 아니라면 그대로 한 개
  if (product.type !== 'SET') {
    return [{ product_id: product.id, product_name: product.name }];
  }

  const [mains, sides, drinks] = await Promise.all([
    Product.findAll({ where: { type: 'MAIN', is_active: true }, raw: true }),
    Product.findAll({ where: { type: 'SIDE', is_active: true }, raw: true }),
    Product.findAll({ where: { type: 'DRINK', is_active: true }, raw: true }),
  ]);

  return [...mains, ...sides, ...drinks].map((p) => ({
    product_id: p.id,
    product_name: p.name,
  }));
};
