exports.toDetailDTO = (o) => {
  if (!o) return null;

  return {
    id: o.id,
    status: o.status,
    table: o.DiningTable
      ? { id: o.DiningTable.id, label: o.DiningTable.label }
      : null,
    payer_name: o.payer_name,
    amounts: {
      subtotal: o.subtotal_amount,
      discount: o.discount_amount,
      total: o.total_amount,
    },
    created_at: o.created_at,
    items: (o.items || []).map((it) => ({
      id: it.id,
      product_id: it.product_id,
      name: it.Product?.name,
      qty: it.quantity,
      unit_price: it.unit_price,
      line_total: it.line_total,
    })),
  };
};

function pickAnchor(order) {
  // Sequelize underscored 옵션에 따라 접근 방식이 다를 수 있어 안전하게 getDataValue 사용
  const get = (k) =>
    typeof order.getDataValue === 'function' ? order.getDataValue(k) : order[k];
  return get('started_at') || get('confirmed_at') || get('created_at');
}

exports.toCardDTO = (order, nowMs) => {
  const anchor = new Date(pickAnchor(order));
  const ageMin = Math.max(0, Math.floor((nowMs - anchor.getTime()) / 60000));

  // DiningTable 포함: include에 [{ model: DiningTable, attributes: ['label'] }]
  const tableLabel =
    order.DiningTable?.label ??
    (typeof order.get === 'function'
      ? order.get('DiningTable')?.label
      : undefined) ??
    null;

  return {
    id: order.id,
    status: order.status, // 'CONFIRMED' | 'IN_PROGRESS'
    table: tableLabel, // 테이블명
    payer_name: order.payer_name ?? null,
    age_min: ageMin, // 경과 분
    placed_at: anchor.toISOString(), // "n분 전" 표시용
  };
};
