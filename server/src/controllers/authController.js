import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.js';
import prisma from '../utils/prisma.js';
import userIntelligenceEngine from '../services/userIntelligenceEngine.js';

// ── POST /api/auth/check-username ─────────────────────────────────────────────
export const checkUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.length < 3) {
      return res.json({ available: false, message: 'Username must be at least 3 characters' });
    }

    // Validate: only letters, numbers, dots, underscores, hyphens
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return res.json({ available: false, message: 'Only letters, numbers, . _ - allowed' });
    }

    const email = `${username.toLowerCase()}@pryro.com`;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      const base = username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const suggestions = [
        `${base}${Math.floor(Math.random() * 99) + 1}`,
        `${base}.${new Date().getFullYear()}`,
        `${base}_pro`,
      ];
      return res.json({ available: false, message: 'Username taken', suggestions });
    }

    res.json({ available: true, email, message: 'Username available' });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ error: 'Failed to check username' });
  }
};

// ── POST /api/auth/register ────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, username, password, phoneNumber, age, gender, country, knoccPrice } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!username?.trim()) return res.status(400).json({ error: 'Username is required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // Validate username format
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, . _ -' });
    }

    // Build the @pryro.com email
    const email = `${username.toLowerCase().trim()}@pryro.com`;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email,
        password: hashedPassword,
        phoneNumber: phoneNumber || null,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        country: country || null,
        knoccPrice: knoccPrice ? parseFloat(knoccPrice) : 1.0,
      },
      select: {
        id: true, name: true, email: true, phoneNumber: true,
        age: true, gender: true, country: true, knoccPrice: true,
        verified: true, walletBalance: true, createdAt: true,
        autoApprove: true, requireReason: true, chatExpiryMonths: true,
      },
    });

    // Run intelligence analysis in background — never block registration
    userIntelligenceEngine.analyzeUser(
      { name, email, phoneNumber, country },
      req.socket?.remoteAddress || req.ip,
      req.get('user-agent')
    ).then(analysis => {
      userIntelligenceEngine.storeAnalysis(user.id, analysis);
    }).catch(() => { /* silent */ });

    const token = generateToken(user.id);
    res.status(201).json({ message: 'Account created successfully', user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Allow login with either full email (alice@pryro.com) or just username (alice)
    const lookupEmail = email.includes('@') ? email.toLowerCase() : `${email.toLowerCase()}@pryro.com`;

    const user = await prisma.user.findUnique({ where: { email: lookupEmail } });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid username or password' });

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login successful', user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};
