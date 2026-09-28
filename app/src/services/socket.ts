import { io, type Socket } from 'socket.io-client';
import { appEnv } from '../config/env';

type SocketSession = {
  getToken: () => Promise<string | null>;
};

export async function createChatSocket(session: SocketSession): Promise<Socket> {
  return io(appEnv.socketUrl, {
    autoConnect: false,
    transports: ['websocket'],
    auth: (callback) => {
      void session.getToken().then((token) => callback({ token })).catch(() => callback({ token: null }));
    }
  });
}
