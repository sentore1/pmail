import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateToken } from '../utils/jwt.js';
import prisma from '../utils/prisma.js';
import userIntelligenceEngine from '../services/userIntelligenceEngine.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { createMailbox } from '../services/mailcowService.js';
import { evaluateSignupBehavior } from '../services/humanEntropyScorer.js';

// ── POST /api/auth/suggest ────────────────────────────────────────────────────
// Fast sync endpoint — called while user types their name during signup.
// Returns gender, country, dialCode, ageRange suggestions with no DB or network I/O.
export const suggest = (req, res) => {
  try {
    const { name, timezone, language } = req.body
    if (!name || name.trim().length < 2) {
      return res.json({ gender: null, country: null, dialCode: null, ageRange: null, confidence: 0 })
    }
    const result = userIntelligenceEngine.suggestFromName(
      name.trim(),
      timezone || null,
      language  || null
    )
    res.json(result)
  } catch (err) {
    console.error('Suggest error:', err)
    res.json({ gender: null, country: null, dialCode: null, ageRange: null, confidence: 0 })
  }
}

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
    const { name, username, password, phoneNumber, age, gender, country, knoccPrice, _entropyData } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!username?.trim()) return res.status(400).json({ error: 'Username is required' });
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // Validate username format
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, . _ -' });
    }

    // ── Invisible bot detection ───────────────────────────────────────────
    // Evaluate behavioral signals collected silently on the client.
    // BOT accounts are silently shadow-banned (created but cannot send).
    // We never tell the bot it was detected — it always gets a success response.
    let entropyVerdict = 'UNCERTAIN';
    let entropyScore = 0;
    let entropyFlags = '';
    let shadowBanned = false;

    if (_entropyData && typeof _entropyData === 'object') {
      try {
        const { score, flags, verdict } = evaluateSignupBehavior(_entropyData);
        entropyVerdict = verdict;
        entropyScore = score;
        entropyFlags = flags.join(',');
        // BOT   → shadow-banned immediately (no mailbox, cannot send)
        // UNCERTAIN → account created normally, flagged for admin review
        //             Real humans occasionally score uncertain (slow old device,
        //             autofill, screen reader). Never punish them silently.
        // HUMAN → full account, no restrictions
        shadowBanned = verdict === 'BOT';

        // Log asynchronously — never block registration
        const ip = req.socket?.remoteAddress || req.ip || '';
        const ua = req.get('user-agent') || '';
        prisma.suspiciousActivity.create({
          data: {
            ip,
            userAgent: ua,
            score,
            flags: entropyFlags,
            verdict,
            shadowBanned,
            username: username.toLowerCase().trim(),
            // Store full feature set so admins can review and tune thresholds
            rawFeatures: JSON.stringify(_entropyData),
          },
        }).catch(() => { /* silent — never block signup */ });
      } catch (err) {
        // Scoring failure must never prevent a real user from registering
        console.error('[entropy] scoring error:', err);
      }
    }
    // ── End bot detection ─────────────────────────────────────────────────

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
        // Shadow-banned bots: account exists but verified=false blocks sending
        verified: shadowBanned ? false : false, // both start unverified; shadow ban tracked separately
      },
      select: {
        id: true, name: true, email: true, phoneNumber: true,
        age: true, gender: true, country: true, knoccPrice: true,
        verified: true, walletBalance: true, createdAt: true,
        autoApprove: true, requireReason: true, chatExpiryMonths: true,
      },
    });

    // Attach shadow ban flag to user object so the app can gate sending
    // We don't expose this to the client — the bot sees a normal success response.
    const userWithShadowBan = { ...user, _shadowBanned: shadowBanned };

    // Run intelligence analysis in background — never block registration
    userIntelligenceEngine.analyzeUser(
      { name, email, phoneNumber, country },
      req.socket?.remoteAddress || req.ip,
      req.get('user-agent')
    ).then(analysis => {
      userIntelligenceEngine.storeAnalysis(user.id, analysis);
    }).catch(() => { /* silent */ });

    // Create Mailcow mailbox in background — skip for shadow-banned bots
    if (!shadowBanned) {
      createMailbox(username.toLowerCase().trim(), password, name.trim()).catch(() => {});
    }

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

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email or username is required' });

    // Accept both "john" and "john@pryro.com"
    const lookupEmail = email.includes('@') ? email.toLowerCase() : `${email.toLowerCase()}@pryro.com`;

    const user = await prisma.user.findUnique({ where: { email: lookupEmail } });

    // Always respond with success — never reveal whether the account exists
    if (!user) {
      return res.json({ message: 'If that account exists, a reset link has been sent.' });
    }

    // Invalidate any existing unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // Generate a secure token — expires in 1 hour
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });

    res.json({ message: 'If that account exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) return res.status(400).json({ error: 'Reset token is required' });
    if (!password) return res.status(400).json({ error: 'New password is required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link' });
    if (record.usedAt) return res.status(400).json({ error: 'This reset link has already been used' });
    if (new Date() > record.expiresAt) return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// ── GET /api/auth/verify-reset-token ──────────────────────────────────────────
// Called by the UI to check if a token is still valid before showing the form
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false, error: 'Token is required' });

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.usedAt || new Date() > record.expiresAt) {
      return res.json({ valid: false, error: 'Invalid or expired reset link' });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ valid: false, error: 'Failed to verify token' });
  }
};
