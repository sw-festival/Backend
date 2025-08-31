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
