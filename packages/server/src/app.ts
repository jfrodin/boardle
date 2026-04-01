import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyJwt from '@fastify/jwt';
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
  const fastify = Fastify({
    logger: opts.silent ? false : { level: 'info' },
  });

  const db: Db = createDb(opts.dbPath);
  fastify.decorate('db', db);

  fastify.register(fastifyJwt, { secret: opts.jwtSecret });

  fastify.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
  });

  fastify.register(fastifyWebsocket);

  fastify.get('/health', async () => ({ status: 'ok' }));

  registerAuthRoutes(fastify, db);
  registerWsRoutes(fastify);

  if (process.env.NODE_ENV === 'production') {
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
