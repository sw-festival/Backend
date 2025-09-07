// src/controllers/sse.controller.js
const sseHub = require('../services/sse.service');
const orderService = require('../services/order.service');
const { toCardDTO, URGENT_MIN } = require('../dtos/order.dto'); // 예시

exports.streamAdminOrders = async (req, res, next) => {
  try {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const client = sseHub.subscribe(res);

    // --- 스냅샷 한번 쏘기 (문제 구간) ---
    try {
      const nowMs = Date.now();
      const rows = await orderService.getActiveOrders();  // <- 여기/아래서 주로 터짐
      const urgent = [], waiting = [], preparing = [];

      for (const o of rows) {
        const card = toCardDTO(o, nowMs);
        const isUrgent = card.age_min >= URGENT_MIN;
        if (isUrgent) urgent.push(card);
        else if (card.status === 'CONFIRMED') waiting.push(card);
        else preparing.push(card);
      }

      sseHub.send(client, 'snapshot', {
        data: { urgent, waiting, preparing },
        meta: {
          now: new Date(nowMs).toISOString(),
          threshold_min: URGENT_MIN,
          counts: {
            urgent: urgent.length, waiting: waiting.length, preparing: preparing.length,
          },
          total: urgent.length + waiting.length + preparing.length,
        },
      });
    } catch (e) {
      console.error('[SSE snapshot error]', e);   // ← 서버 콘솔에서 원인 확인
      sseHub.send(client, 'snapshot', { error: 'snapshot_failed' });
    }

    req.on('close', () => sseHub.unsubscribe(client));
  } catch (err) {
    next(err);
  }
};
