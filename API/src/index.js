import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { registerChatSocket } from './modules/chat/chat.socket.js';
import { storageCleanupService } from './modules/media/storageCleanup.service.js';
import { prisma } from './shared/database/prisma.js';

const app = createApp();
const server = createServer(app);
const storageCleanupTimer = setInterval(() => {
  storageCleanupService.processDue().catch((error) => {
    console.error(JSON.stringify({ level: 'error', code: error?.code ?? 'STORAGE_CLEANUP_FAILED' }));
  });
}, 60_000);
storageCleanupTimer.unref?.();

storageCleanupService.processDue().catch((error) => {
  console.error(JSON.stringify({ level: 'error', code: error?.code ?? 'STORAGE_CLEANUP_FAILED' }));
});

registerChatSocket(server);

server.listen(env.PORT, '0.0.0.0', () => {
  console.info(JSON.stringify({
    level: 'info',
    message: 'TrocaLivros API iniciada.',
    host: '0.0.0.0',
    port: env.PORT,
    authMode: 'native',
    environment: env.NODE_ENV,
    storageMode: env.STORAGE_MODE
  }));
});

async function shutdown(signal) {
  console.info(JSON.stringify({ level: 'info', message: 'Encerrando API.', signal }));
  clearInterval(storageCleanupTimer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
