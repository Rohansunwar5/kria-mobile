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

// Rooms the same way: the server keeps one membership per connection, so two
// screens on one match share it. Each holds the room while mounted (joining is
// still each hook's job, and is safe to repeat), and only the last one out
// tells the server to leave.
const rooms = new Map<string, number>();
type Room = 'match' | 'auction';
const roomKey = (room: Room, payload: Record<string, string>) => `${room}:${JSON.stringify(payload)}`;

export function holdRoom(room: Room, payload: Record<string, string>) {
  const key = roomKey(room, payload);
  rooms.set(key, (rooms.get(key) ?? 0) + 1);
}

export function releaseRoom(room: Room, payload: Record<string, string>) {
  const key = roomKey(room, payload);
  const left = (rooms.get(key) ?? 1) - 1;
  if (left > 0) {
    rooms.set(key, left);
    return;
  }
  rooms.delete(key);
  socket.emit(`leave:${room}`, payload);
}
