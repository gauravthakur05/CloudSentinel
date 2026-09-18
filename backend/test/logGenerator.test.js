const {
  generateSyntheticLog,
  generateSyntheticLogBatch,
  SERVICES,
} = require('../src/utils/logGenerator');

describe('logGenerator', () => {
  test('generateSyntheticLog produces a well-formed log entry', () => {
    const log = generateSyntheticLog();

    expect(log).toHaveProperty('timestamp');
    expect(log.timestamp).toBeInstanceOf(Date);
    expect(SERVICES).toContain(log.serviceName);
    expect(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).toContain(log.level);
    expect(typeof log.message).toBe('string');
    expect(log.message.length).toBeGreaterThan(0);
    expect(typeof log.requestId).toBe('string');
    expect(log.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(log.cpuUsagePercent).toBeGreaterThanOrEqual(0);
    expect(log.cpuUsagePercent).toBeLessThanOrEqual(100);
    expect(log.memoryUsagePercent).toBeGreaterThanOrEqual(0);
    expect(log.memoryUsagePercent).toBeLessThanOrEqual(100);
  });

  test('generateSyntheticLog produces unique requestIds across calls', () => {
    const a = generateSyntheticLog();
    const b = generateSyntheticLog();
    expect(a.requestId).not.toBe(b.requestId);
  });

  test('ERROR/CRITICAL logs skew toward higher response times than INFO', () => {
    // Generate a large sample and compare average response times by level,
    // since level assignment is randomized per call.
    const sample = generateSyntheticLogBatch(500);
    const infoTimes = sample.filter((l) => l.level === 'INFO').map((l) => l.responseTimeMs);
    const errorTimes = sample
      .filter((l) => l.level === 'ERROR' || l.level === 'CRITICAL')
      .map((l) => l.responseTimeMs);

    const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;

    expect(infoTimes.length).toBeGreaterThan(0);
    expect(errorTimes.length).toBeGreaterThan(0);
    expect(avg(errorTimes)).toBeGreaterThan(avg(infoTimes));
  });

  test('generateSyntheticLogBatch returns the requested count', () => {
    const batch = generateSyntheticLogBatch(37);
    expect(batch).toHaveLength(37);
  });
});
