import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { registerChatSocket } from './modules/chat/chat.socket.js';
import { prisma } from './shared/database/prisma.js';

const app = createApp();
const server = createServer(app);

registerChatSocket(server);

server.listen(env.PORT, () => {
  console.info(JSON.stringify({
    level: 'info',
    message: 'MyBooks API iniciada.',
    port: env.PORT,
    authMode: env.AUTH_MODE,
    storageMode: env.STORAGE_MODE
  }));
});

async function shutdown(signal) {
  console.info(JSON.stringify({ level: 'info', message: 'Encerrando API.', signal }));
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
