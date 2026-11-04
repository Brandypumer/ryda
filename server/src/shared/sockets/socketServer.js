import { Server } from 'socket.io';
import { getClientOrigin } from '../config/clientOrigin.js';

let io;

export function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: getClientOrigin(),
      methods: ['GET', 'POST']
    }
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialized.');
  return io;
}
