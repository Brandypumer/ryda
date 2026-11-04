import { io } from 'socket.io-client';

let rideSocket;

export function friendlyRideSocketError() {
  return 'Live updates are temporarily unavailable. Reconnecting…';
}

export function getRideSocket(accessToken) {
  if (!rideSocket) {
    const configuredUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socketUrl = configuredUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    rideSocket = io(socketUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      auth: { token: accessToken }
    });
  } else {
    rideSocket.auth = { token: accessToken };
  }

  return rideSocket;
}
