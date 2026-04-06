const { withRetry, defaultShouldRetry } = require('./retry');

const deadlockErr = { parent: { code: 'ER_LOCK_DEADLOCK' } };
const timeoutErr = { parent: { code: 'ER_LOCK_WAIT_TIMEOUT' } };
const otherErr = new Error('some other error');

// 실제 setTimeout 지연 없이 즉시 재시도 — 테스트 속도 및 결정성 확보
const NO_DELAY = { minDelayMs: 0, maxDelayMs: 0 };

describe('defaultShouldRetry', () => {
  it('ER_LOCK_DEADLOCK은 재시도 대상', () => {
    expect(defaultShouldRetry(deadlockErr)).toBe(true);
  });

  it('ER_LOCK_WAIT_TIMEOUT은 재시도 대상', () => {
    expect(defaultShouldRetry(timeoutErr)).toBe(true);
  });

  it('그 외 에러는 재시도 대상 아님', () => {
    expect(defaultShouldRetry(otherErr)).toBe(false);
  });
});

describe('withRetry', () => {
  it('첫 시도에 성공하면 1번만 실행', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, NO_DELAY);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ER_LOCK_DEADLOCK 발생 시 재시도 후 성공', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(deadlockErr)
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, NO_DELAY);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('ER_LOCK_WAIT_TIMEOUT 발생 시 재시도 후 성공', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(timeoutErr)
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, NO_DELAY);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('최대 재시도 횟수 초과 시 에러 throw', async () => {
    const fn = jest.fn().mockRejectedValue(deadlockErr);

    await expect(withRetry(fn, { retries: 2, ...NO_DELAY })).rejects.toEqual(deadlockErr);
    expect(fn).toHaveBeenCalledTimes(3); // 최초 1회 + 재시도 2회
  });

  it('재시도 불가 에러는 즉시 throw (재시도 없음)', async () => {
    const fn = jest.fn().mockRejectedValue(otherErr);

    await expect(withRetry(fn, NO_DELAY)).rejects.toThrow('some other error');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
