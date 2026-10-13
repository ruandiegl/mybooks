import { Server } from 'socket.io';
import { env } from '../../config/env.js';
import { verifyAccessToken } from '../auth/auth.crypto.js';
import { authRepository } from '../auth/auth.repository.js';
import { sessionRevocations } from '../auth/auth.revocation.js';
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

export function registerChatSocket(httpServer, { repository = authRepository, service = chatService, verifyToken = verifyAccessToken, revocationBus = sessionRevocations } = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGINS,
      credentials: true
    }
  });

  io.use(createSocketAuthenticator({ verifyToken, findActiveSession: repository.findActiveSession.bind(repository) }));

  const onRevoked = ({ userId, sessionIds, reason }) => {
    const revoked = new Set(sessionIds);
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.identity?.userId !== userId || !revoked.has(socket.data.identity.sessionId)) continue;
      socket.emit('session:revoked', { reason: reason === 'rotated' ? 'rotated' : 'terminal' });
      socket.disconnect(true);
    }
  };
  revocationBus.on('revoked', onRevoked);
  httpServer.once('close', () => revocationBus.off('revoked', onRevoked));

  io.on('connection', (socket) => {
    metrics.increment('socketConnections');
    const userId = socket.data.user.id;
    socket.join('user:' + userId);

    socket.use(async (packet, next) => {
      let reason = 'unavailable';
      try {
        const live = await repository.findActiveSession(socket.data.identity.sessionId, userId, new Date());
        if (!live) {
          reason = repository.sessionRetirementReason ? await repository.sessionRetirementReason(socket.data.identity.sessionId, userId) : 'terminal';
          throw Error('UNAUTHENTICATED');
        }
        reason = 'terminal';
        await verifyToken(socket.handshake.auth?.token);
        next();
      } catch (error) {
        const ack = packet[packet.length - 1];
        reject(ack, { code: 'UNAUTHENTICATED', message: 'Sessão inválida ou expirada.' });
        socket.emit('session:revoked', { reason: error?.code === 'ERR_JWT_EXPIRED' ? 'expired' : reason });
        socket.disconnect(true);
        next(new Error('UNAUTHENTICATED'));
      }
    });
    // A revocation can commit between the handshake query and the connection callback.
    void repository.findActiveSession(socket.data.identity.sessionId, userId, new Date()).then(async session => {
      if (!session && socket.connected) {
        const reason = repository.sessionRetirementReason ? await repository.sessionRetirementReason(socket.data.identity.sessionId, userId) : 'terminal';
        socket.emit('session:revoked', { reason }); socket.disconnect(true);
      }
    }).catch(() => { socket.disconnect(true); });

    socket.on('conversation:join', async (payload, ack) => {
      try {
        await service.assertMember(payload?.conversationId, userId);
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
        const message = await service.sendMessage(userId, payload?.conversationId, payload);
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
        await service.markRead(userId, payload?.conversationId);
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
        await service.assertMember(payload?.conversationId, userId);
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
