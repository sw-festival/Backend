// src/services/sse.service.js
class SseHub {
  constructor() {
    this.clients = new Set();
    this.heartbeatMs = 25_000;
    this._startHeartbeat();
  }

  _startHeartbeat() {
    this._timer = setInterval(() => {
      for (const c of this.clients) {
        this._safeWrite(c, 'ping', 'pong');
      }
    }, this.heartbeatMs);
  }

  _safeWrite(client, event, data) {
    try {
      client.res.write(`event: ${event}\n`);
      // 문자열이면 그대로, 아니면 JSON 직렬화
      const payload =
        typeof data === 'string' ? data : JSON.stringify(data ?? {});
      client.res.write(`data: ${payload}\n\n`);
    } catch {
      // 끊긴 클라이언트 정리
      this.clients.delete(client);
    }
  }

  subscribe(res) {
    // 연결 직후 프록시 버퍼링 방지용 더미 라인
    res.write(`: connected\n\n`);
    const client = {
      id: Date.now() + Math.random(),
      res,
      createdAt: Date.now(),
    };
    this.clients.add(client);
    return client;
  }

  unsubscribe(client) {
    if (!client) return;
    try {
      client.res.end();
    } catch {}
    this.clients.delete(client);
  }

  // 유니캐스트: 특정 클라이언트에게만 전송
  send(client, event, data) {
    if (!client) return;
    this._safeWrite(client, event, data);
  }

  // 브로드캐스트: 모든 클라이언트에게 전송
  publish(event, data) {
    for (const c of this.clients) {
      this._safeWrite(c, event, data);
    }
  }
}

module.exports = new SseHub();
