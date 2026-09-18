process.env.JWT_SECRET = 'test_secret_for_jest_only';

jest.mock('../src/models/Log');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const Log = require('../src/models/Log');
const { createApp } = require('../src/app');

const app = createApp();

function tokenFor(role) {
  return jwt.sign({ id: 'u1', email: 'u@example.com', role }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
}

describe('log routes authentication and RBAC', () => {
  test('GET /api/logs without a token is rejected', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.status).toBe(401);
  });

  test('GET /api/logs with a malformed header is rejected', async () => {
    const res = await request(app).get('/api/logs').set('Authorization', 'not-bearer');
    expect(res.status).toBe(401);
  });

  test('DELETE /api/logs/:id is rejected for analyst role', async () => {
    const res = await request(app)
      .delete('/api/logs/64ffabc0000000000000001')
      .set('Authorization', `Bearer ${tokenFor('analyst')}`);
    expect(res.status).toBe(403);
  });

  test('DELETE /api/logs/:id is allowed for admin role', async () => {
    Log.findByIdAndDelete.mockResolvedValue({ _id: '64ffabc0000000000000001' });
    const res = await request(app)
      .delete('/api/logs/64ffabc0000000000000001')
      .set('Authorization', `Bearer ${tokenFor('admin')}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/logs filtering', () => {
  beforeEach(() => jest.clearAllMocks());

  test('builds a filter object from query params and paginates', async () => {
    const mockChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ level: 'ERROR', serviceName: 'api-gateway' }]),
    };
    Log.find.mockReturnValue(mockChain);
    Log.countDocuments.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/logs?service=api-gateway&level=ERROR&page=2&limit=10')
      .set('Authorization', `Bearer ${tokenFor('analyst')}`);

    expect(res.status).toBe(200);
    expect(Log.find).toHaveBeenCalledWith({ serviceName: 'api-gateway', level: 'ERROR' });
    expect(mockChain.skip).toHaveBeenCalledWith(10); // (page 2 - 1) * limit 10
    expect(mockChain.limit).toHaveBeenCalledWith(10);
    expect(res.body.pagination).toEqual({ page: 2, limit: 10, total: 1, totalPages: 1 });
  });

  test('caps limit at 200 to prevent unbounded queries', async () => {
    const mockChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    Log.find.mockReturnValue(mockChain);
    Log.countDocuments.mockResolvedValue(0);

    await request(app)
      .get('/api/logs?limit=99999')
      .set('Authorization', `Bearer ${tokenFor('analyst')}`);

    expect(mockChain.limit).toHaveBeenCalledWith(200);
  });
});

describe('POST /api/logs ingestion validation', () => {
  test('rejects a log missing required fields', async () => {
    const res = await request(app)
      .post('/api/logs')
      .set('Authorization', `Bearer ${tokenFor('analyst')}`)
      .send({ serviceName: 'web-server' }); // missing level, message

    expect(res.status).toBe(400);
  });

  test('rejects an invalid level', async () => {
    const res = await request(app)
      .post('/api/logs')
      .set('Authorization', `Bearer ${tokenFor('analyst')}`)
      .send({ serviceName: 'web-server', level: 'NOT_A_LEVEL', message: 'hi' });

    expect(res.status).toBe(400);
  });

  test('accepts a well-formed log and reports inserted count', async () => {
    Log.insertMany.mockResolvedValue([{ _id: '1' }]);
    const res = await request(app)
      .post('/api/logs')
      .set('Authorization', `Bearer ${tokenFor('analyst')}`)
      .send({
        serviceName: 'web-server',
        level: 'INFO',
        message: 'ok',
        hostname: 'sim-host-01',
        requestId: 'abc',
        responseTimeMs: 120,
        cpuUsagePercent: 10,
        memoryUsagePercent: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(1);
  });
});
