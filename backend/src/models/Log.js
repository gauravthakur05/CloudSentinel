const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    hostname: { type: String, required: true },
    serviceName: {
      type: String,
      required: true,
      enum: [
        'web-server',
        'database-service',
        'auth-service',
        'api-gateway',
        'background-worker',
      ],
    },
    level: {
      type: String,
      required: true,
      enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
    },
    message: { type: String, required: true },
    requestId: { type: String, required: true },
    responseTimeMs: { type: Number, required: true, min: 0 },
    // Simulated resource metrics generated alongside each log line.
    cpuUsagePercent: { type: Number, required: true, min: 0, max: 100 },
    memoryUsagePercent: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: { createdAt: 'ingestedAt', updatedAt: false } }
);

// Compound index: the Log Explorer's most common query is "this service,
// most recent first" - this index covers that filter + sort in one pass.
logSchema.index({ serviceName: 1, timestamp: -1 });

// Compound index for severity-based filtering combined with time range.
logSchema.index({ level: 1, timestamp: -1 });

// Fast direct lookup when tracing a single request across services.
logSchema.index({ requestId: 1 });

// Text index enables keyword search over the log message field.
logSchema.index({ message: 'text' });

module.exports = mongoose.model('Log', logSchema);
