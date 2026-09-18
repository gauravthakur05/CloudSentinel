const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/logRoutes');

function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'cloudsentinel-backend' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', apiRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Central error handler (catches anything thrown/passed to next(err))
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[error]', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
