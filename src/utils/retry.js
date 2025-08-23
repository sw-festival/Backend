// 지수 백오프 + 지터. 기본은 데드락(1213), 락타임아웃(1205)에서만 재시도.
function defaultShouldRetry(err) {
  const code = err?.parent?.code || err?.original?.code;
  return code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT';
}

async function withRetry(
  fn,
  {
    retries = 4,
    minDelayMs = 20,
    maxDelayMs = 200,
    shouldRetry = defaultShouldRetry,
  } = {}
) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (!shouldRetry(err) || attempt >= retries) throw err;

      // 지수 + 지터
      const base = Math.min(maxDelayMs, minDelayMs * Math.pow(2, attempt));
      const jitter = Math.floor(Math.random() * base);
      const sleep = Math.min(maxDelayMs, base + jitter);
      await new Promise((r) => setTimeout(r, sleep));

      attempt += 1;
    }
  }
}

module.exports = { withRetry, defaultShouldRetry };
