import { io, type Socket } from 'socket.io-client';
import { appEnv } from '../config/env';

type SocketSession = {
  getToken: () => Promise<string | null>;
  devUserId?: string;
};

export async function createChatSocket(session: SocketSession): Promise<Socket> {
  const token = await session.getToken();

  return io(appEnv.socketUrl, {
    autoConnect: false,
    transports: ['websocket'],
    auth: token
      ? { token }
      : { devUserId: session.devUserId || appEnv.devUserId }
  });
}
