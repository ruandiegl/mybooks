import { Server } from 'socket.io';
import { verifyToken } from '@clerk/express';
import { env } from '../../config/env.js';
import { usersService } from '../users/users.service.js';
import { chatService } from './chat.service.js';
import { metrics } from '../../shared/observability/metrics.js';

function room(conversationId) {
  return 'conversation:' + conversationId;
}

async function authenticateSocket(socket, next) {
  try {
    let clerkUserId;

    if (env.AUTH_MODE === 'development') {
      clerkUserId = socket.handshake.auth?.devUserId;
    } else {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Token ausente.');
      const payload = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
        jwtKey: env.CLERK_JWT_KEY,
        authorizedParties: env.CLERK_AUTHORIZED_PARTIES.length
          ? env.CLERK_AUTHORIZED_PARTIES
          : undefined
      });
      clerkUserId = payload.sub;
    }

    if (!clerkUserId) throw new Error('Identidade ausente.');
    socket.data.user = await usersService.ensureCurrentUser(clerkUserId);
    next();
  } catch {
    next(new Error('UNAUTHENTICATED'));
  }
}

function reject(ack, error) {
  metrics.increment('socketErrors');
  if (typeof ack === 'function') {
    ack({
      ok: false,
      error: {
        code: error.code || 'SOCKET_ERROR',
        message: error.message || 'Não foi possível concluir a operação.'
      }
    });
  }
}

export function registerChatSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGINS,
      credentials: true
    }
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    metrics.increment('socketConnections');
    const userId = socket.data.user.id;
    socket.join('user:' + userId);

    socket.on('conversation:join', async (payload, ack) => {
      try {
        await chatService.assertMember(payload?.conversationId, userId);
        socket.join(room(payload.conversationId));
        socket.to(room(payload.conversationId)).emit('presence:updated', {
          userId,
          status: 'online'
        });
        ack?.({ ok: true });
      } catch (error) {
        reject(ack, error);
      }
    });

    socket.on('message:send', async (payload, ack) => {
      try {
        const message = await chatService.sendMessage(userId, payload?.conversationId, payload);
        metrics.increment('socketMessagesAccepted');
        io.to(room(payload.conversationId)).emit('message:created', message);
        const acknowledgment = {
          ok: true,
          data: {
            clientMessageId: message.clientMessageId,
            messageId: message.id,
            status: 'accepted'
          }
        };
        socket.emit('message:ack', acknowledgment.data);
        ack?.(acknowledgment);
      } catch (error) {
        reject(ack, error);
      }
    });

    socket.on('message:read', async (payload, ack) => {
      try {
        await chatService.markRead(userId, payload?.conversationId);
        socket.to(room(payload.conversationId)).emit('message:read', {
          conversationId: payload.conversationId,
          userId,
          readAt: new Date().toISOString()
        });
        ack?.({ ok: true });
      } catch (error) {
        reject(ack, error);
      }
    });

    socket.on('presence:typing', async (payload) => {
      try {
        await chatService.assertMember(payload?.conversationId, userId);
        socket.to(room(payload.conversationId)).emit('presence:typing', {
          conversationId: payload.conversationId,
          userId,
          isTyping: Boolean(payload.isTyping)
        });
      } catch {
        // Eventos efêmeros inválidos são ignorados sem vazar detalhes.
      }
    });
  });

  return io;
}
