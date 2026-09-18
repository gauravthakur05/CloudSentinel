const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the URI supplied via environment variables.
 * Works identically against a local Docker Compose mongo container or
 * a MongoDB Atlas connection string - only MONGO_URI needs to change.
 */
async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) {
    throw new Error('MONGO_URI is not defined. Check your .env file.');
  }

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });

  console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
