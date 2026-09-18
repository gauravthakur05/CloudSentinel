const crypto = require('crypto');

const SERVICES = [
  'web-server',
  'database-service',
  'auth-service',
  'api-gateway',
  'background-worker',
];

const HOSTNAMES = ['sim-host-01', 'sim-host-02', 'sim-host-03', 'sim-host-04'];

// Level weights bias toward INFO, as a real system would, with occasional
// warnings and rare errors/criticals - this shape is what makes anomaly
// detection meaningful later (spikes stand out against a quiet baseline).
const LEVEL_WEIGHTS = [
  { level: 'INFO', weight: 70 },
  { level: 'WARNING', weight: 20 },
  { level: 'ERROR', weight: 8 },
  { level: 'CRITICAL', weight: 2 },
];

const MESSAGE_TEMPLATES = {
  INFO: [
    'Request completed successfully',
    'Health check passed',
    'Cache hit for resource',
    'Scheduled job finished',
    'User session refreshed',
  ],
  WARNING: [
    'Response time exceeded soft threshold',
    'Connection pool nearing capacity',
    'Deprecated API endpoint called',
    'Retry attempted after transient failure',
  ],
  ERROR: [
    'Database query timeout',
    'Unhandled exception in request handler',
    'Failed to reach downstream service',
    'Authentication attempt failed',
  ],
  CRITICAL: [
    'Service health check failing repeatedly',
    'Out of memory condition detected (simulated)',
    'Database connection pool exhausted',
  ],
};

function pickWeighted(weightedList) {
  const total = weightedList.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weightedList) {
    if (roll < item.weight) return item.level;
    roll -= item.weight;
  }
  return weightedList[weightedList.length - 1].level;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInRange(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

/**
 * Generates one synthetic log entry. Purely local computation - no
 * external calls, no real system data.
 */
function generateSyntheticLog() {
  const level = pickWeighted(LEVEL_WEIGHTS);
  const serviceName = pick(SERVICES);
  const isSlow = level === 'ERROR' || level === 'CRITICAL';

  return {
    timestamp: new Date(),
    hostname: pick(HOSTNAMES),
    serviceName,
    level,
    message: pick(MESSAGE_TEMPLATES[level]),
    requestId: crypto.randomUUID(),
    responseTimeMs: isSlow ? randomInRange(800, 4000) : randomInRange(20, 400),
    cpuUsagePercent: isSlow ? randomInRange(60, 98) : randomInRange(5, 55),
    memoryUsagePercent: isSlow ? randomInRange(55, 95) : randomInRange(10, 60),
  };
}

/**
 * Generates a batch of synthetic logs at once (useful for seeding).
 */
function generateSyntheticLogBatch(count = 50) {
  return Array.from({ length: count }, () => generateSyntheticLog());
}

module.exports = {
  generateSyntheticLog,
  generateSyntheticLogBatch,
  SERVICES,
  HOSTNAMES,
};
