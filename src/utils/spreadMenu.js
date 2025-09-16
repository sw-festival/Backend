const { Product } = require('../models/index');

// 메인 메뉴 규칙
const BONUS_MAIN_MULTIPLIER = {
  2: 2,
};

exports.spreadMenu = async function spreadMenu({ productId }) {
  const product = await Product.findByPk(productId, { raw: true });
  if (!product) return [];

  // 세트가 아니면 그대로 한 개
  if (product.type !== 'SET') {
    return [{ product_id: product.id, product_name: product.name }];
  }

  // 세트일 때: MAIN / SIDE / DRINK 전부 조회
  const [mains, sides, drinks] = await Promise.all([
    Product.findAll({ where: { type: 'MAIN', is_active: true }, raw: true }),
    Product.findAll({ where: { type: 'SIDE', is_active: true }, raw: true }),
    Product.findAll({ where: { type: 'DRINK', is_active: true }, raw: true }),
  ]);

  // 메인에만 배수 규칙 적용
  const expandedMains = [];
  for (const m of mains) {
    const times = BONUS_MAIN_MULTIPLIER[m.id] ?? 1;
    for (let i = 0; i < times; i++) {
      expandedMains.push(m);
    }
  }

  // 펼친 목록 반환
  return [...expandedMains, ...sides, ...drinks].map((p) => ({
    product_id: p.id,
    product_name: p.name,
  }));
};
