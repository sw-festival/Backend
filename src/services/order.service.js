const { StatusCodes } = require('http-status-codes');
const { Op, literal, fn, col, where: w } = require('sequelize');

const AppError = require('../errors/AppError');
const sseHub = require('../services/sse.service');
const { createOrder } = require('../services/notion.service');
const { Client } = require('@notionhq/client');

const {
  sequelize,
  Order,
  OrderProduct,
  Product,
  DiningTable,
} = require('../models');
const { withRetry } = require('../utils/retry');

/* =========================
 * 주문 생성
 * ========================= */
exports.createOrder = async ({ session, order_type, payer_name, items }) => {
  if (!session)
    throw new AppError('Session required', StatusCodes.UNAUTHORIZED);
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items required', StatusCodes.BAD_REQUEST);
  }

  const out = await withRetry(async () => {
    return await sequelize.transaction(async (t) => {
      // 세션 카운트/활성 갱신
      const [upRes] = await sequelize.query(
        `
        UPDATE order_sessions
           SET order_count = order_count + 1,
               visit_started_at = IFNULL(visit_started_at, NOW()),
               last_active_at   = NOW()
         WHERE id = ?
           AND status = 'OPEN'
        `,
        { replacements: [session.id], transaction: t }
      );

      const affected =
        typeof upRes?.affectedRows === 'number'
          ? upRes.affectedRows
          : typeof upRes === 'number'
            ? upRes
            : 0;
      if (!affected) {
        throw new AppError(
          'Invalid or closed session',
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }

      // 세션 잠금 읽기
      const [[sesRow]] = await sequelize.query(
        `
        SELECT id, table_id, order_count, visit_started_at
          FROM order_sessions
         WHERE id = ?
         FOR UPDATE
        `,
        { replacements: [session.id], transaction: t }
      );

      const nextSeq = Number(sesRow.order_count);
      const tableId = Number(sesRow.table_id);
      const firstOrderAt = sesRow.visit_started_at
        ? new Date(sesRow.visit_started_at)
        : new Date();

      // 라인 계산
      let subtotal = 0;
      const lines = [];
      for (const it of items) {
        const p = await Product.findOne({
          where: { id: it.product_id, is_active: true },
          transaction: t,
        });
        if (!p)
          throw new AppError(
            `invalid product: ${it.product_id}`,
            StatusCodes.BAD_REQUEST
          );

        const qty = Number(it.quantity || 0);
        if (qty < 1)
          throw new AppError('quantity >= 1', StatusCodes.BAD_REQUEST);

        const unit = Number(p.price);
        const line = Number((unit * qty).toFixed(2));
        subtotal = Number((subtotal + line).toFixed(2));

        lines.push({
          product_id: p.id,
          product_name: p.name,
          quantity: qty,
          unit_price: unit,
          line_total: line,
        });
      }

      // 할인/합계
      let discount = 0,
        reason = null;
      if (order_type === 'TAKEOUT') {
        discount = Number((subtotal * 0.1).toFixed(2));
        reason = 'TAKEOUT_10_OFF';
      }
      const total = Number((subtotal - discount).toFixed(2));

      // 주문 생성
      const order = await Order.create(
        {
          order_session_id: session.id,
          table_id: tableId,
          order_seq: nextSeq,
          payer_name: payer_name || null,
          order_type: order_type || 'DINE_IN',
          status: 'PENDING',
          subtotal_amount: subtotal,
          discount_amount: discount,
          total_amount: total,
          discount_reason: reason,
        },
        { transaction: t }
      );

      // 항목 생성
      for (const L of lines) {
        await OrderProduct.create(
          { order_id: order.id, ...L },
          { transaction: t }
        );
      }

      // 트랜잭션 결과(노션용 보조 데이터 포함)
      return {
        order_id: order.id,
        order_seq: order.order_seq,
        order_type: order.order_type,
        status: order.status,
        subtotal_amount: order.subtotal_amount,
        discount_amount: order.discount_amount,
        total_amount: order.total_amount,
        first_order_at: firstOrderAt,
        _notion: {
          tableId,
          lines, // product_name 포함
          payer_name: order.payer_name,
        },
      };
    });
  });

  // 트랜잭션 밖: 노션 동기화 (실패해도 주문 성공은 유지)
  (async () => {
    try {
      const table = await DiningTable.findByPk(out._notion.tableId, {
        attributes: ['label'],
        raw: true,
      });
      const tableLabel = table?.label ?? String(out._notion.tableId);

      await createOrder({
        order: {
          order_type: out.order_type, // ← out에 이미 들어있음
          payer_name: out._notion.payer_name,
          status: out.status,
          table_id: out._notion.tableId,
        },
        lines: out._notion.lines,
        tableLabel,
      });
    } catch (err) {
      console.warn('[NOTION] sync failed:', err?.body || err);
    }
  })();

  // SSE 알림 (에러는 무시)
  try {
    sseHub.publish('orders_changed', {
      type: 'created',
      order_id: out.order_id,
    });
  } catch (e) {
    console.warn('[SSE publish failed - createOrder]', e);
  }

  return out;
};

// 유한 상태 머신
const ALLOWED = {
  PENDING: { confirm: 'CONFIRMED', cancel: 'CANCELED' },
  CONFIRMED: { start: 'IN_PROGRESS', cancel: 'CANCELED' },
  IN_PROGRESS: { serve: 'SERVED' },
  SERVED: {},
  CANCELED: {},
};

exports.updateOrderStatus = async ({ id, action, reason, admin }) => {
  if (!action) throw new AppError('action required', StatusCodes.BAD_REQUEST);

  return await sequelize.transaction(async (t) => {
    const order = await Order.findByPk(id, {
      include: [{ model: OrderProduct, as: 'items' }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw new AppError('order not found', StatusCodes.NOT_FOUND);
    }

    const next = ALLOWED[order.status]?.[action];
    if (!next) {
      throw new AppError(
        `invalid transition: ${order.status} -> (${action})`,
        StatusCodes.CONFLICT
      );
    }

    if (order.status === 'PENDING' && action === 'confirm') {
      for (const it of order.items) {
        const [affected] = await Product.update(
          { stock: literal(`stock - ${it.quantity}`) },
          {
            where: { id: it.product_id, stock: { [Op.gte]: it.quantity } },
            transaction: t,
          }
        );
        if (!affected) throw new AppError('out of stock', StatusCodes.CONFLICT);
      }
    }

    if (order.status === 'CONFIRMED' && action === 'cancel') {
      for (const it of order.items) {
        await Product.update(
          { stock: literal(`stock + ${it.quantity}`) },
          { where: { id: it.product_id }, transaction: t }
        );
      }
    }

    const prev = order.status;
    order.status = next;

    await order.save({ transaction: t });

    return { order_id: id, prev, next };
  });
};

exports.getActiveOrders = async () => {
  try {
    return await Order.findAll({
      where: { status: { [Op.in]: ['CONFIRMED', 'IN_PROGRESS'] } },
      attributes: [
        'id',
        'order_session_id',
        'table_id',
        'payer_name',
        'status',
        'created_at',
      ],
      include: [{ model: DiningTable, attributes: ['label'] }],
      order: [['id', 'DESC']],
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
};

exports.getOrderDetail = async (orderId) => {
  try {
    return await Order.findByPk(orderId, {
      include: [
        { model: DiningTable, attributes: ['id', 'label'] },
        {
          model: OrderProduct,
          as: 'items',
          attributes: [
            'id',
            'product_id',
            'quantity',
            'unit_price',
            'line_total',
          ],
          include: [{ model: Product, attributes: ['id', 'name'] }],
        },
      ],
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
};

function decodeCursor(cur) {
  if (!cur) return null;
  const [ts, id] = Buffer.from(cur, 'base64').toString('utf8').split('|');
  return { ts: new Date(ts), id: Number(id) };
}
function encodeCursor(row) {
  const ts =
    row.get('created_at') instanceof Date
      ? row.get('created_at')
      : new Date(row.get('created_at'));
  return Buffer.from(`${ts.toISOString()}|${row.id}`).toString('base64');
}

// 항상 DESC 정렬(실제 컬럼을 fully-qualified로)
const ORDER_DESC = [
  [col('Order.created_at'), 'DESC'],
  [col('Order.id'), 'DESC'],
];

function buildFilters({ filters }) {
  const where = {};
  const include = [];

  if (filters?.status) {
    where.status = { [Op.in]: String(filters.status).split(',') };
  }
  if (filters?.order_type) {
    where.order_type = { [Op.in]: String(filters.order_type).split(',') };
  }
  if (filters?.from) {
    where.created_at = {
      ...(where.created_at || {}),
      [Op.gte]: new Date(filters.from),
    };
  }
  if (filters?.to) {
    where.created_at = {
      ...(where.created_at || {}),
      [Op.lte]: new Date(filters.to),
    };
  }

  if (filters?.table_slug) {
    include.push({
      model: DiningTable,
      attributes: [], // 필터만
      where: { slug: String(filters.table_slug) },
      required: true,
    });
  }

  return { where, include };
}

function buildCursorWhere({ after, before }) {
  const a = decodeCursor(after);
  const b = decodeCursor(before);

  if (a) {
    // older: (created_at < ts) OR (created_at = ts AND id < id)
    return {
      [Op.or]: [
        { created_at: { [Op.lt]: a.ts } },
        { [Op.and]: [{ created_at: a.ts }, { id: { [Op.lt]: a.id } }] },
      ],
    };
  }
  if (b) {
    // newer: (created_at > ts) OR (created_at = ts AND id > id)
    return {
      [Op.or]: [
        { created_at: { [Op.gt]: b.ts } },
        { [Op.and]: [{ created_at: b.ts }, { id: { [Op.gt]: b.id } }] },
      ],
    };
  }
  return {};
}

exports.listOrders = async ({ limit = 20, after, before, filters, scope }) => {
  const { where, include } = buildFilters({ filters });

  // 사용자 스코프: 해당 세션 주문만
  if (scope?.sessionId) {
    where.order_session_id = scope.sessionId;
  }

  const hasKeys = (obj) =>
    !!obj &&
    (Object.keys(obj).length > 0 ||
      Object.getOwnPropertySymbols(obj).length > 0);

  const cursorWhere = buildCursorWhere({ after, before });

  const finalWhere = hasKeys(cursorWhere)
    ? hasKeys(where)
      ? { [Op.and]: [where, cursorWhere] }
      : cursorWhere
    : where;

  // 정확한 has_more 위해 limit+1
  const limitPlus = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100)) + 1;

  const rows = await Order.findAll({
    where: finalWhere,
    subQuery: false, // 서브쿼리 비활성화 (include + limit 시 커서 무시 방지)
    distinct: true, // join 시 중복 제거
    include: [
      ...include,
      // 테이블 정보(노출용)
      ...(include.some((i) => i.model === DiningTable)
        ? []
        : [
            {
              model: DiningTable,
              attributes: ['label', 'slug'],
              required: false,
            },
          ]),
      // 주문 항목 (페이징 깨지지 않도록 별도 쿼리)
      {
        model: OrderProduct,
        as: 'items',
        separate: true,
        attributes: [
          'id',
          'product_id',
          'quantity',
          'unit_price',
          'line_total',
        ],
        include: [{ model: Product, attributes: ['id', 'name'] }],
        order: [['id', 'ASC']],
      },
    ],
    attributes: [
      'id',
      'status',
      'order_type',
      'payer_name',
      'total_amount',
      'created_at', // ✅ 실제 컬럼명 선택
    ],
    order: ORDER_DESC,
    limit: limitPlus,
    // logging: process.env.SQL_LOG === '1' ? console.log : false, // 필요시 .env로 켜기
    logging: console.log,
  });

  const has_more = rows.length === limitPlus;
  const slice = has_more ? rows.slice(0, limitPlus - 1) : rows;

  const first = slice[0];
  const last = slice[slice.length - 1];

  return {
    items: slice.map((r) => ({
      id: r.id,
      status: r.status,
      order_type: r.order_type,
      payer_name: r.payer_name ?? null,
      created_at: r.get('created_at'),
      total_amount: r.total_amount ?? null,
      table: r.DiningTable
        ? { label: r.DiningTable.label, slug: r.DiningTable.slug }
        : null,
      items: Array.isArray(r.items)
        ? r.items.map((it) => ({
            id: it.id,
            product_id: it.product_id,
            name: it.Product?.name ?? null,
            quantity: it.quantity,
            unit_price: it.unit_price,
            line_total: it.line_total,
          }))
        : [],
    })),
    page_info: {
      next_cursor: last ? encodeCursor(last) : null, // 더 과거로 내려갈 때(after)
      prev_cursor: first ? encodeCursor(first) : null, // 더 최신으로 올라갈 때(before)
      has_more,
    },
  };
};
