import { randomUUID } from 'crypto';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/index.js';
import { users } from '../db/schema.js';

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
