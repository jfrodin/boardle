import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { registerWsRoutes } from './ws/wsHandler.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

const fastify = Fastify({ logger: { level: 'info' } });

await fastify.register(fastifyWebsocket);

// CORS headers for dev
fastify.addHook('onRequest', async (_req, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type');
});

fastify.get('/health', async () => ({ status: 'ok' }));

registerWsRoutes(fastify);

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`Kalaha server running on port ${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
