import { io, Socket } from 'socket.io-client';

export function connectSocket(jwt: string): Socket {
  const socket = io(process.env.API_BASE_URL || '', {
    autoConnect: true,
    reconnection: true,
    auth: { token: jwt },
    transports: ['websocket']
  });

  socket.joinBatch = (id: string) => {
    socket.emit('joinBatch', id);
  };
  socket.leaveBatch = (id: string) => {
    socket.emit('leaveBatch', id);
  };

  return socket;
}
