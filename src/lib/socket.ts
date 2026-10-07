import { io } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/config';

export const socket = io(SOCKET_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  autoConnect: false,
});

// Screens stack (a knockout match opens over its still-mounted bracket), so no
// one screen owns the connection: each live hook holds it while mounted, and
// only the last one out disconnects.
let holds = 0;

export function acquireSocket() {
  holds += 1;
  if (!socket.connected) socket.connect();
}

export function releaseSocket() {
  holds = Math.max(0, holds - 1);
  if (holds === 0) socket.disconnect();
}
