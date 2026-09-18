const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // Only allow 'admin' role to be self-assigned in this MVP if explicitly
    // requested; in a real deployment, admin creation would be gated further.
    const safeRole = role === 'admin' ? 'admin' : 'analyst';

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role: safeRole });

    const token = signToken(user);
    return res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed', details: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const matches = await user.comparePassword(password);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    return res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed', details: err.message });
  }
}

async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: user.toSafeObject() });
}

module.exports = { register, login, me };
