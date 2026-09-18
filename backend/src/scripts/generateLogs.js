/**
 * One-off seeding script.
 * Usage: npm run generate:logs -- --count=500
 */
require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const Log = require('../models/Log');
const { generateSyntheticLogBatch } = require('../utils/logGenerator');

function parseCount() {
  const arg = process.argv.find((a) => a.startsWith('--count='));
  const value = arg ? parseInt(arg.split('=')[1], 10) : 200;
  return Number.isFinite(value) && value > 0 ? value : 200;
}

async function main() {
  const count = parseCount();
  await connectDB();
  const batch = generateSyntheticLogBatch(count);
  const created = await Log.insertMany(batch);
  console.log(`[seed] inserted ${created.length} synthetic logs`);
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
