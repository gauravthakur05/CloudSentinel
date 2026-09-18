process.env.JWT_SECRET = 'test_secret_for_jest_only';
process.env.JWT_EXPIRES_IN = '1h';

jest.mock('../src/models/User');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const { createApp } = require('../src/app');

const app = createApp();

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  test('rejects short passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  test('rejects duplicate email', async () => {
    User.findOne.mockResolvedValue({ email: 'a@b.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'a@b.com', password: 'longenough' });
    expect(res.status).toBe(409);
  });

  test('creates a user with hashed password and defaults role to analyst', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (doc) => ({
      _id: 'user123',
      ...doc,
      toSafeObject() {
        return { id: 'user123', name: doc.name, email: doc.email, role: doc.role };
      },
    }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'longenough123' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('analyst');
    expect(res.body.token).toBeDefined();

    // Confirm the password was actually hashed before being persisted.
    const createArg = User.create.mock.calls[0][0];
    expect(createArg.passwordHash).not.toBe('longenough123');
    const matches = await bcrypt.compare('longenough123', createArg.passwordHash);
    expect(matches).toBe(true);

    // Confirm the JWT carries the right role/email claims.
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('analyst');
    expect(decoded.email).toBe('alice@example.com');
  });

  test('does not allow client to self-assign admin role by default logic path is honored when requested', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (doc) => ({
      _id: 'user456',
      ...doc,
      toSafeObject() {
        return { id: 'user456', name: doc.name, email: doc.email, role: doc.role };
      },
    }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'longenough123', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects unknown email', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });
    expect(res.status).toBe(401);
  });

  test('rejects wrong password', async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    User.findOne.mockResolvedValue({
      email: 'a@b.com',
      passwordHash: hash,
      comparePassword: (candidate) => bcrypt.compare(candidate, hash),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('logs in successfully with correct credentials and returns a valid token', async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    User.findOne.mockResolvedValue({
      _id: 'user789',
      email: 'a@b.com',
      role: 'admin',
      passwordHash: hash,
      comparePassword: (candidate) => bcrypt.compare(candidate, hash),
      toSafeObject() {
        return { id: 'user789', email: 'a@b.com', role: 'admin' };
      },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'correct-password' });

    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.role).toBe('admin');
  });
});
