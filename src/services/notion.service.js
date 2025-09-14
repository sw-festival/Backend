const { Client } = require('@notionhq/client');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DB_ID  = process.env.NOTION_DB_ID;

const enabled = !!(NOTION_API_KEY && NOTION_DB_ID);
const notion  = enabled ? new Client({ auth: NOTION_API_KEY }) : null;

async function createNotionRowsForOrder({ order, lines, tableLabel }) {
  if (!enabled) {
    console.warn(
      '[NOTION] disabled: set NOTION_API_KEY & NOTION_DB_ID to enable'
    );
    return { ok: 0, fail: 0 };
  }
  // 포장은 제외
  if (order.order_type !== 'DINE_IN') return { ok: 0, fail: 0 };

  const timestampISO = new Date().toISOString();
  let ok = 0,
    fail = 0;

  for (const line of lines) {
    for (let i = 0; i < line.quantity; i++) {
      const payload = {
        parent: { database_id: NOTION_DB_ID },
        properties: {
          timestamp: { date: { start: timestampISO } },
          table: {
            title: [
              { text: { content: tableLabel ?? String(order.table_id) } },
            ],
          },
          payer_name: {
            rich_text: [{ text: { content: order.payer_name ?? '' } }],
          },
          menu: { rich_text: [{ text: { content: line.product_name } }] },
          status: { status: { name: order.status } },
        },
      };
      try {
        await notion.pages.create(payload);
        ok++;
      } catch (err) {
        fail++;
        console.error('[NOTION] create FAIL:', err?.body || err);
      }
    }
  }
  if (fail) console.warn(`[NOTION] done: ok=${ok}, fail=${fail}`);
}

module.exports = {
  notionEnabled: enabled,
  createOrder: createNotionRowsForOrder,
}
