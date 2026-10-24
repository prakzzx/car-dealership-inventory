import 'dotenv/config';
import { createApp } from './app';
import { loadConfig } from './config/env';
import { createPrismaClient } from './db/prisma';

const config = loadConfig();
const prisma = createPrismaClient(config.databaseUrl);
const app = createApp({ config, prisma });

const server = app.listen(config.port, () => {
  console.log(`AutoHub API listening on http://localhost:${config.port} (${config.nodeEnv})`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
