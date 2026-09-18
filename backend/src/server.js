require('dotenv').config();
const { createApp } = require('./app');
const { connectDB } = require('./config/db');
const Log = require('./models/Log');
const { generateSyntheticLog } = require('./utils/logGenerator');

const PORT = process.env.PORT || 5000;

let generatorTimer = null;

function startLogGenerator() {
  const enabled = process.env.LOG_GENERATOR_ENABLED !== 'false';
  if (!enabled) return;

  const intervalMs = parseInt(process.env.LOG_GENERATOR_INTERVAL_MS, 10) || 2000;

  generatorTimer = setInterval(async () => {
    try {
      const log = generateSyntheticLog();
      await Log.create(log);
    } catch (err) {
      console.error('[log-generator] failed to write synthetic log:', err.message);
    }
  }, intervalMs);

  console.log(`[log-generator] running every ${intervalMs}ms`);
}

async function start() {
  try {
    await connectDB();
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`[server] CloudSentinel backend listening on port ${PORT}`);
      startLogGenerator();
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  if (generatorTimer) clearInterval(generatorTimer);
  process.exit(0);
});

start();
