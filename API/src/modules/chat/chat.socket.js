import { Server } from 'socket.io';
import { env } from '../../config/env.js';
import { verifyAccessToken } from '../auth/auth.crypto.js';
import { authRepository } from '../auth/auth.repository.js';
import { chatService } from './chat.service.js';
import { metrics } from '../../shared/observability/metrics.js';

function room(conversationId) {
  return 'conversation:' + conversationId;
}

export function createSocketAuthenticator({
  verifyToken = verifyAccessToken,
  findActiveSession = authRepository.findActiveSession.bind(authRepository)
} = {}) {
  return async function authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) throw new Error('Token ausente.');

      const identity = await verifyToken(token);
      const session = await findActiveSession(identity.sessionId, identity.userId, new Date());
      if (!session?.user || session.user.id !== identity.userId) throw new Error('Sessão inválida.');

      socket.data.identity = identity;
      socket.data.user = session.user;
      return next();
    } catch {
      return next(new Error('UNAUTHENTICATED'));
    }
  };
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

  io.use(createSocketAuthenticator());

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
