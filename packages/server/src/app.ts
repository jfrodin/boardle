import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyJwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { createDb, type Db } from './db/index.js';
import { registerAuthRoutes } from './auth/authRoutes.js';
import { registerWsRoutes } from './ws/wsHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AppOptions {
  /** SQLite file path. Use ':memory:' in tests. */
  dbPath: string;
  /** JWT signing secret. Must be >=32 chars in production. */
  jwtSecret: string;
  /** Allowed CORS origin. Use '*' for dev, real origin in prod. */
  corsOrigin: string;
  /** Suppress fastify logger output in tests. */
  silent?: boolean;
}

export function buildApp(opts: AppOptions) {
  const fastify = Fastify({
    logger: opts.silent ? false : { level: 'info' },
  });

  const db: Db = createDb(opts.dbPath);

  // Decorate fastify with the db instance so routes can access it
  fastify.decorate('db', db);

  // JWT
  fastify.register(fastifyJwt, { secret: opts.jwtSecret });

  // Rate limiting (applied globally; individual routes can override)
  fastify.register(rateLimit, {
    global: false, // opt-in per-route
    max: 100,
    timeWindow: '1 minute',
  });

  // WebSocket support
  fastify.register(fastifyWebsocket);

  // CORS
  fastify.register(fastifyCors, {
    origin: opts.corsOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  fastify.get('/health', async () => ({ status: 'ok' }));

  registerAuthRoutes(fastify, db);
  registerWsRoutes(fastify);

  // Serve built React app in production
  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.resolve(__dirname, '../../client/dist');
    fastify.register(fastifyStatic, {
      root: clientDist,
      wildcard: false,
    });
    // SPA fallback — all unmatched GET requests return index.html
    fastify.setNotFoundHandler(async (_req, reply) => {
      return reply.sendFile('index.html', clientDist);
    });
  }

  return fastify;
}

// Extend FastifyInstance type so TypeScript knows about db
declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}
