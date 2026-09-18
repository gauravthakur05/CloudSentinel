const express = require('express');
const {
  createLog,
  getLogs,
  getLogById,
  deleteLog,
  getOverview,
  getServiceBreakdown,
  generateNow,
} = require('../controllers/logController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

// All log/analytics routes require a valid logged-in user (admin or analyst).
router.use(requireAuth);

router.post('/logs', createLog);
router.get('/logs', getLogs);
router.get('/logs/:id', getLogById);
router.delete('/logs/:id', requireRole('admin'), deleteLog);
router.post('/logs/generate', generateNow);

router.get('/analytics/overview', getOverview);
router.get('/analytics/services', getServiceBreakdown);

module.exports = router;
