import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';

const TEST_SECRET = 'test-secret-that-is-long-enough-32chars!!';

function makeApp(): FastifyInstance {
  return buildApp({
    dbPath: ':memory:',
    jwtSecret: TEST_SECRET,
    corsOrigin: '*',
    silent: true,
  });
}

/** Extract the auth_token value from the Set-Cookie header */
function extractCookie(setCookieHeader: string | string[] | undefined): string | null {
  const header = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!header) return null;
  const match = header.match(/auth_token=([^;]+)/);
  return match ? match[1] : null;
}

async function register(
  app: FastifyInstance,
  body: object,
): Promise<{ status: number; body: Record<string, unknown>; cookie: string | null }> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: body,
  });
  return {
    status: res.statusCode,
    body: res.json(),
    cookie: extractCookie(res.headers['set-cookie']),
  };
}

async function login(
  app: FastifyInstance,
  body: object,
): Promise<{ status: number; body: Record<string, unknown>; cookie: string | null }> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: body,
  });
  return {
    status: res.statusCode,
    body: res.json(),
    cookie: extractCookie(res.headers['set-cookie']),
  };
}

async function me(
  app: FastifyInstance,
  cookie: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await app.inject({
    method: 'GET',
    url: '/auth/me',
    headers: { cookie: `auth_token=${cookie}` },
  });
  return { status: res.statusCode, body: res.json() };
}

// ---- Tests ----

describe('POST /auth/register', () => {
  let app: FastifyInstance;
  beforeEach(async () => { app = makeApp(); await app.ready(); });
  afterEach(async () => { await app.close(); });

  it('creates a user, sets auth cookie, and returns user', async () => {
    const { status, body, cookie } = await register(app, {
      username: 'alice',
      email: 'alice@example.com',
      password: 'password123',
    });
    expect(status).toBe(201);
    expect(typeof cookie).toBe('string');
    expect((body.user as Record<string, unknown>).username).toBe('alice');
    expect((body.user as Record<string, unknown>).email).toBe('alice@example.com');
    expect((body.user as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(body.token).toBeUndefined(); // token must NOT be in response body
  });

  it('normalises email to lowercase', async () => {
    const { body } = await register(app, {
      username: 'Bob',
      email: 'BOB@EXAMPLE.COM',
      password: 'password123',
    });
    expect((body.user as Record<string, unknown>).email).toBe('bob@example.com');
  });

  it('rejects duplicate email', async () => {
    await register(app, { username: 'carol', email: 'carol@example.com', password: 'password123' });
    const { status, body } = await register(app, {
      username: 'carol2',
      email: 'carol@example.com',
      password: 'password123',
    });
    expect(status).toBe(409);
    expect((body as Record<string, unknown>).error).toBe('CONFLICT');
  });

  it('rejects duplicate username', async () => {
    await register(app, { username: 'dave', email: 'dave@example.com', password: 'password123' });
    const { status, body } = await register(app, {
      username: 'dave',
      email: 'dave2@example.com',
      password: 'password123',
    });
    expect(status).toBe(409);
    expect((body as Record<string, unknown>).error).toBe('CONFLICT');
  });

  it('rejects short username', async () => {
    const { status } = await register(app, { username: 'ab', email: 'x@x.com', password: 'password123' });
    expect(status).toBe(400);
  });

  it('rejects username with special characters', async () => {
    const { status } = await register(app, { username: 'bad user!', email: 'x@x.com', password: 'password123' });
    expect(status).toBe(400);
  });

  it('rejects invalid email', async () => {
    const { status } = await register(app, { username: 'user1', email: 'not-an-email', password: 'password123' });
    expect(status).toBe(400);
  });

  it('rejects password shorter than 8 chars', async () => {
    const { status } = await register(app, { username: 'user2', email: 'u2@x.com', password: 'short' });
    expect(status).toBe(400);
  });

  it('rejects missing fields', async () => {
    const { status } = await register(app, { username: 'user3' });
    expect(status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = makeApp();
    await app.ready();
    await register(app, { username: 'testuser', email: 'test@example.com', password: 'correctpassword' });
  });
  afterEach(async () => { await app.close(); });

  it('sets auth cookie and returns user on correct credentials', async () => {
    const { status, body, cookie } = await login(app, { email: 'test@example.com', password: 'correctpassword' });
    expect(status).toBe(200);
    expect(typeof cookie).toBe('string');
    expect((body.user as Record<string, unknown>).username).toBe('testuser');
    expect(body.token).toBeUndefined(); // token must NOT be in response body
  });

  it('is case-insensitive for email', async () => {
    const { status } = await login(app, { email: 'TEST@EXAMPLE.COM', password: 'correctpassword' });
    expect(status).toBe(200);
  });

  it('rejects wrong password', async () => {
    const { status, body } = await login(app, { email: 'test@example.com', password: 'wrongpassword' });
    expect(status).toBe(401);
    expect((body as Record<string, unknown>).error).toBe('INVALID_CREDENTIALS');
  });

  it('rejects unknown email', async () => {
    const { status, body } = await login(app, { email: 'nobody@example.com', password: 'correctpassword' });
    expect(status).toBe(401);
    expect((body as Record<string, unknown>).error).toBe('INVALID_CREDENTIALS');
  });

  it('does not leak whether email exists (same error message)', async () => {
    const wrongPass = await login(app, { email: 'test@example.com', password: 'wrong' });
    const unknownEmail = await login(app, { email: 'nobody@example.com', password: 'correct' });
    expect(wrongPass.body.message).toBe(unknownEmail.body.message);
  });

  it('rejects invalid email format', async () => {
    const { status } = await login(app, { email: 'not-email', password: 'somepassword' });
    expect(status).toBe(400);
  });
});

describe('GET /auth/me', () => {
  let app: FastifyInstance;
  let cookie: string;

  beforeEach(async () => {
    app = makeApp();
    await app.ready();
    const { cookie: c } = await register(app, {
      username: 'meuser',
      email: 'me@example.com',
      password: 'password123',
    });
    cookie = c!;
  });
  afterEach(async () => { await app.close(); });

  it('returns user for valid cookie', async () => {
    const { status, body } = await me(app, cookie);
    expect(status).toBe(200);
    expect((body.user as Record<string, unknown>).username).toBe('meuser');
  });

  it('rejects missing cookie', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects tampered cookie', async () => {
    const { status } = await me(app, cookie + 'tampered');
    expect(status).toBe(401);
  });

  it('rejects token signed with wrong secret', async () => {
    const otherApp = buildApp({ dbPath: ':memory:', jwtSecret: 'completely-different-secret-32chars!', corsOrigin: '*', silent: true });
    await otherApp.ready();
    const { cookie: otherCookie } = await register(otherApp, { username: 'x', email: 'x@x.com', password: 'password123' });
    await otherApp.close();
    const { status } = await me(app, otherCookie!);
    expect(status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = makeApp();
    await app.ready();
  });
  afterEach(async () => { await app.close(); });

  it('clears the auth cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/logout' });
    expect(res.statusCode).toBe(200);
    const setCookie = res.headers['set-cookie'] as string | undefined;
    expect(setCookie).toBeDefined();
    // Cookie should be cleared (max-age=0 or expires in the past)
    expect(setCookie).toMatch(/auth_token=;|Max-Age=0/i);
  });
});
