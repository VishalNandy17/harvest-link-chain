import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config';

export function setupSocket(io: Server) {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const payload = jwt.verify(token, config.JWT_SECRET);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    socket.on('joinBatch', (batchId: string) => {
      socket.join(`batch:${batchId}`);
    });
  });
}
