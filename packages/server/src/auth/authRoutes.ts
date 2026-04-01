import { randomUUID, randomBytes } from 'crypto';
import { eq, or, lt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Resend } from 'resend';
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/index.js';
import { users, passwordResetTokens } from '../db/schema.js';

// ---- Validation schemas ----

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, _ and -'),
  email: z
    .string()
    .email('Invalid email address')
    .max(254, 'Email too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'), // bcrypt truncates at 72 bytes
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'),
});

// ---- Helpers ----

const BCRYPT_ROUNDS = 12;

interface JwtPayload {
  userId: string;
  username: string;
}

function issueToken(fastify: FastifyInstance, payload: JwtPayload): string {
  return fastify.jwt.sign(payload, { expiresIn: '7d' });
}

// ---- Route registration ----

export function registerAuthRoutes(fastify: FastifyInstance, db: Db): void {

  // POST /auth/register
  fastify.post('/auth/register', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: result.error.issues[0]?.message ?? 'Invalid input',
      });
    }

    const { username, email, password } = result.data;
    const normalizedEmail = email.toLowerCase();

    // Check uniqueness — check both in one query to avoid timing differences
    const existing = await db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(
        or(
          eq(users.email, normalizedEmail),
          eq(users.username, username),
        ),
      );

    if (existing.length > 0) {
      const conflict = existing[0];
      const field = conflict.email === normalizedEmail ? 'email' : 'username';
      return reply.status(409).send({
        error: 'CONFLICT',
        message: `That ${field} is already taken`,
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = {
      id: randomUUID(),
      username,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date(),
    };

    await db.insert(users).values(newUser);

    const token = issueToken(fastify, { userId: newUser.id, username });

    return reply.status(201).send({
      token,
      user: { id: newUser.id, username, email: normalizedEmail },
    });
  });

  // POST /auth/login
  fastify.post('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: result.error.issues[0]?.message ?? 'Invalid input',
      });
    }

    const { email, password } = result.data;
    const normalizedEmail = email.toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    // Always run bcrypt compare to prevent user enumeration via timing
    const hashToCheck = user?.passwordHash ?? '$2b$12$invalidhashpaddingtomakethiswork123456789';
    const valid = await bcrypt.compare(password, hashToCheck);

    if (!user || !valid) {
      return reply.status(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const token = issueToken(fastify, { userId: user.id, username: user.username });

    return reply.send({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  });

  // POST /auth/forgot-password
  fastify.post('/auth/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Invalid input' });
    }

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase();

    // Always return 200 to prevent email enumeration
    const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, normalizedEmail));
    if (!user) return reply.send({ ok: true });

    // Delete any existing tokens for this user, then create a new one
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
    // Also clean up any globally expired tokens
    await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.insert(passwordResetTokens).values({ token, userId: user.id, expiresAt });

    const resendKey = process.env.RESEND_API_KEY;
    const appUrl = process.env.APP_URL ?? 'https://boardle.se';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'Boardle <noreply@boardle.se>',
        to: user.email,
        subject: 'Reset your Boardle password',
        html: `
          <p>Hi,</p>
          <p>Someone requested a password reset for your Boardle account.</p>
          <p><a href="${resetLink}" style="color:#7c3aed;font-weight:bold;">Reset my password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <p>— Boardle</p>
        `,
      });
    } else {
      // Dev fallback — log the link
      console.log(`[DEV] Password reset link: ${resetLink}`);
    }

    return reply.send({ ok: true });
  });

  // POST /auth/reset-password
  fastify.post('/auth/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Invalid input' });
    }

    const { token, password } = result.data;

    const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    if (!row || row.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'INVALID_TOKEN', message: 'This reset link is invalid or has expired.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));

    const [user] = await db.select({ id: users.id, username: users.username, email: users.email }).from(users).where(eq(users.id, row.userId));
    if (!user) return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found' });

    const newToken = issueToken(fastify, { userId: user.id, username: user.username });
    return reply.send({ token: newToken, user });
  });

  // GET /auth/me — requires valid JWT
  fastify.get('/auth/me', async (req, reply) => {
    let payload: JwtPayload;
    try {
      await req.jwtVerify();
      payload = req.user as JwtPayload;
    } catch {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }

    const [user] = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, payload.userId));

    if (!user) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found' });
    }

    return reply.send({ user });
  });
}
