import express from 'express';
import bcrypt from 'bcrypt';
import { body } from 'express-validator';
import { query, transaction } from '../config/database.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { generateToken } from '../utils/crypto.js';
import { emailService } from '../utils/email.js';
import logger from '../config/logger.js';

const router = express.Router();

/** Generate 6-char alphanumeric reset code */
function generateResetCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/auth/signup
 * Register a new user
 */
function isAtLeast18(dateOfBirth) {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}

router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 3, max: 50 }).trim(),
    body('password').isLength({ min: 8 }),
    body('dateOfBirth').isISO8601().toDate().withMessage('Valid date of birth required'),
    body('confirmAge18').equals('true').withMessage('You must confirm you are 18 or older'),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email, username, password, dateOfBirth } = req.body;

      if (!isAtLeast18(dateOfBirth)) {
        return res.status(400).json({ error: 'You must be 18 or older to create an account' });
      }

      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Email or username already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user and wallet in a transaction
      const result = await transaction(async (client) => {
        // Insert user into PostgreSQL (include date_of_birth if column exists)
        const userResult = await client.query(
          `INSERT INTO users (email, username, password_hash, date_of_birth)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, username, created_at, is_active`,
          [email, username, passwordHash, dateOfBirth]
        );

        const user = userResult.rows[0];

        // Verify user was persisted
        const verifyResult = await client.query(
          'SELECT id, email, username, created_at, is_active FROM users WHERE id = $1',
          [user.id]
        );

        if (verifyResult.rows.length === 0) {
          throw new Error('User registration verification failed - user not found in database');
        }

        const verifiedUser = verifyResult.rows[0];
        logger.info('User persisted to PostgreSQL', {
          id: verifiedUser.id,
          email: verifiedUser.email,
          username: verifiedUser.username,
        });

        // Wallet is auto-created by trigger, verify it exists
        const walletResult = await client.query(
          'SELECT id, balance FROM wallets WHERE user_id = $1',
          [user.id]
        );

        if (walletResult.rows.length === 0) {
          throw new Error('Wallet was not auto-created for new user');
        }

        return {
          user: verifiedUser,
          wallet: walletResult.rows[0],
        };
      });

      // Generate tokens
      const tokens = generateTokens(result.user.id);

      // Store refresh token
      await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [result.user.id, tokens.refreshToken]
      );

      logger.info(`New user registered in PostgreSQL: ${email} (id: ${result.user.id})`);

      // Send welcome email (fire-and-forget)
      emailService.sendWelcome(email, username).catch(err => logger.warn('Welcome email failed:', err));

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          created_at: result.user.created_at,
          is_active: result.user.is_active,
        },
        tokens,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/signin
 * Sign in existing user
 */
router.post(
  '/signin',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user
      const result = await query(
        'SELECT id, email, username, password_hash, is_active, COALESCE(is_admin, false) as is_admin FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate tokens
      const tokens = generateTokens(user.id);

      // Store refresh token
      await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [user.id, tokens.refreshToken]
      );

      logger.info(`User signed in: ${email}`);

      res.json({
        message: 'Sign in successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isAdmin: !!user.is_admin,
        },
        tokens,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if token exists in database and is not revoked
    const result = await query(
      `SELECT user_id FROM refresh_tokens 
       WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Generate new access token
    const tokens = generateTokens(decoded.userId);

    res.json({
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/signout
 * Sign out user (revoke refresh token)
 */
router.post('/signout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke refresh token
      await query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
        [refreshToken]
      );
    }

    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset - sends code via email
 */
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const userResult = await query(
        'SELECT id, username FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      // Always return success (don't reveal if email exists)
      if (userResult.rows.length === 0) {
        return res.json({ message: 'If that email is registered, you will receive reset instructions.' });
      }

      const user = userResult.rows[0];
      const code = generateResetCode();

      await query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [user.id, code]
      );

      const emailResult = await emailService.sendPasswordReset(email, user.username, code);
      if (!emailResult.success) {
        // Dev fallback: log code so user can complete reset when email fails
        logger.warn('Password reset code (use this if email not received):', { email, code });
        if (emailResult.error?.includes('own email address') || emailResult.error?.includes('verify a domain')) {
          logger.warn('Resend test sender only delivers to your Resend account email. See EMAIL_SETUP.md for fix.');
        }
      }

      res.json({ message: 'If that email is registered, you will receive reset instructions.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Confirm password reset with code
 */
router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Reset code must be 6 characters'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email, code, newPassword } = req.body;

      const tokenResult = await query(
        `SELECT prt.id, prt.user_id, u.email, u.username
         FROM password_reset_tokens prt
         JOIN users u ON u.id = prt.user_id
         WHERE u.email = $1 AND prt.token = $2 AND prt.expires_at > NOW() AND prt.used = false`,
        [email, code.toUpperCase()]
      );

      if (tokenResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired reset code' });
      }

      const { id: tokenId, user_id: userId, username } = tokenResult.rows[0];

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await transaction(async (client) => {
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [passwordHash, userId]
        );
        await client.query(
          'UPDATE password_reset_tokens SET used = true WHERE id = $1',
          [tokenId]
        );
      });

      await emailService.sendPasswordChanged(email, username).catch(err => logger.warn('Password changed email failed:', err));

      res.json({ message: 'Password has been reset. You can now sign in.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
