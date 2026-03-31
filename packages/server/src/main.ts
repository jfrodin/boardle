import { buildApp } from './app.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
const DB_PATH = process.env.DB_PATH ?? './data/app.db';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-this-in-production-min-32-chars!!';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

if (process.env.NODE_ENV === 'production' && JWT_SECRET.startsWith('dev-secret')) {
  console.error('ERROR: JWT_SECRET env variable must be set in production');
  process.exit(1);
}

const fastify = buildApp({ dbPath: DB_PATH, jwtSecret: JWT_SECRET, corsOrigin: CORS_ORIGIN });

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`Boardly server running on port ${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
