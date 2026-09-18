const Log = require('../models/Log');
const { generateSyntheticLog, SERVICES } = require('../utils/logGenerator');

const VALID_LEVELS = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];

/**
 * POST /api/logs
 * Accepts either a single log object or an array of log objects.
 * This is the ingestion endpoint the collector / generator writes to.
 */
async function createLog(req, res) {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];

    for (const entry of payload) {
      if (!entry.serviceName || !entry.level || !entry.message) {
        return res.status(400).json({
          error: 'Each log requires at least serviceName, level and message',
        });
      }
      if (!VALID_LEVELS.includes(entry.level)) {
        return res.status(400).json({ error: `Invalid level: ${entry.level}` });
      }
    }

    const created = await Log.insertMany(payload, { ordered: false });
    return res.status(201).json({ inserted: created.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to ingest log(s)', details: err.message });
  }
}

/**
 * GET /api/logs
 * Supports filtering by service, level, date range and keyword search,
 * plus pagination and sorting. All filters are optional and combinable.
 *
 * Query params: service, level, from, to, q, hostname, requestId,
 *               page (default 1), limit (default 25), sort (default -timestamp)
 */
async function getLogs(req, res) {
  try {
    const {
      service,
      level,
      from,
      to,
      q,
      hostname,
      requestId,
      page = 1,
      limit = 25,
      sort = '-timestamp',
    } = req.query;

    const filter = {};
    if (service) filter.serviceName = service;
    if (level) filter.level = level;
    if (hostname) filter.hostname = hostname;
    if (requestId) filter.requestId = requestId;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    if (q) filter.$text = { $search: q };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      Log.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Log.countDocuments(filter),
    ]);

    return res.json({
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch logs', details: err.message });
  }
}

/**
 * GET /api/logs/:id
 */
async function getLogById(req, res) {
  try {
    const log = await Log.findById(req.params.id).lean();
    if (!log) return res.status(404).json({ error: 'Log not found' });
    return res.json({ data: log });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid log id', details: err.message });
  }
}

/**
 * DELETE /api/logs/:id
 * Restricted to admin role at the route level.
 */
async function deleteLog(req, res) {
  try {
    const result = await Log.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Log not found' });
    return res.json({ message: 'Log deleted' });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid log id', details: err.message });
  }
}

/**
 * GET /api/analytics/overview
 * Powers the dashboard's summary cards using a single aggregation pipeline.
 */
async function getOverview(req, res) {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000); // last hour

    const [totals, byLevel, recentRate] = await Promise.all([
      Log.countDocuments({}),
      Log.aggregate([{ $group: { _id: '$level', count: { $sum: 1 } } }]),
      Log.countDocuments({ timestamp: { $gte: since } }),
    ]);

    const levelCounts = { INFO: 0, WARNING: 0, ERROR: 0, CRITICAL: 0 };
    byLevel.forEach((row) => {
      levelCounts[row._id] = row.count;
    });

    return res.json({
      totalLogs: totals,
      logsLastHour: recentRate,
      levelCounts,
      services: SERVICES,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute overview', details: err.message });
  }
}

/**
 * GET /api/analytics/services
 * Per-service log counts and average response time, via aggregation.
 */
async function getServiceBreakdown(req, res) {
  try {
    const breakdown = await Log.aggregate([
      {
        $group: {
          _id: '$serviceName',
          logCount: { $sum: 1 },
          avgResponseTimeMs: { $avg: '$responseTimeMs' },
          errorCount: {
            $sum: { $cond: [{ $in: ['$level', ['ERROR', 'CRITICAL']] }, 1, 0] },
          },
        },
      },
      { $sort: { logCount: -1 } },
    ]);

    return res.json({ data: breakdown });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute service breakdown', details: err.message });
  }
}

/**
 * POST /api/logs/generate
 * Manually triggers creation of N synthetic logs - convenient for demos
 * and for testing the ingestion + storage path end-to-end.
 */
async function generateNow(req, res) {
  try {
    const count = Math.min(parseInt(req.body?.count, 10) || 20, 500);
    const logs = Array.from({ length: count }, () => generateSyntheticLog());
    const created = await Log.insertMany(logs);
    return res.status(201).json({ inserted: created.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate logs', details: err.message });
  }
}

module.exports = {
  createLog,
  getLogs,
  getLogById,
  deleteLog,
  getOverview,
  getServiceBreakdown,
  generateNow,
};
