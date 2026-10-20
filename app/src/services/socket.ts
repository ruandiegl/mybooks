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
      const provideNoToken = () => callback({ token: null });
      try {
        void session.getToken().then((token) => callback({ token }), provideNoToken);
      } catch {
        provideNoToken();
      }
    }
  });
}
