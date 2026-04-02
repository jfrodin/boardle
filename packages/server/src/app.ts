import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createDb, type Db } from './db/index.js';
import { registerAuthRoutes } from './auth/authRoutes.js';
import { registerWsRoutes } from './ws/wsHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AppOptions {
  dbPath: string;
  jwtSecret: string;
  corsOrigin: string;
  silent?: boolean;
}

export function buildApp(opts: AppOptions) {
  const isProd = process.env.NODE_ENV === 'production';

  const fastify = Fastify({
    logger: opts.silent ? false : { level: 'info' },
  });

  const db: Db = createDb(opts.dbPath);
  fastify.decorate('db', db);

  // Cookie parsing — must be before JWT so cookies are available on req
  fastify.register(fastifyCookie);

  // CORS — credentials: true is required when the client sends cookies
  fastify.register(fastifyCors, {
    origin: opts.corsOrigin === '*' ? true : opts.corsOrigin,
    credentials: true,
  });

  // Security headers (helmet)
  // CSP only in production — dev needs Vite HMR WebSocket and loose origins
  fastify.register(fastifyHelmet, {
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'wss:', 'ws:'],
        frameAncestors: ["'none'"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  });

  // JWT — reads from Authorization header OR auth_token HttpOnly cookie
  fastify.register(fastifyJwt, {
    secret: opts.jwtSecret,
    cookie: {
      cookieName: 'auth_token',
      signed: false,
    },
  });

  fastify.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
  });

  fastify.get('/health', async () => ({ status: 'ok' }));

  registerAuthRoutes(fastify, db);

  // Register WebSocket plugin and routes inside a scoped plugin
  // so the decorator is guaranteed to be available when routes are added
  fastify.register(async (instance) => {
    await instance.register(fastifyWebsocket);
    registerWsRoutes(instance);
  });

  if (isProd) {
    const clientDist = path.resolve(__dirname, '../../client/dist');
    fastify.register(fastifyStatic, {
      root: clientDist,
      wildcard: false,
    });
    fastify.setNotFoundHandler(async (_req, reply) => {
      return reply.sendFile('index.html', clientDist);
    });
  }

  return fastify;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}
