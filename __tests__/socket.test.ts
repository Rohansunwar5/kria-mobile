import { acquireSocket, holdRoom, releaseRoom, releaseSocket, socket } from '@/lib/socket';

// Two screens on the same match (a match opened over a bracket holding it too)
// share one connection, and the server keeps one room membership for it. The
// first screen to close must not take the other one out of the room.
it('leaves a room only when the last screen holding it closes', () => {
  const emit = jest.spyOn(socket, 'emit').mockReturnValue(socket);

  holdRoom('match', { matchId: 'm1' });
  holdRoom('match', { matchId: 'm1' });
  holdRoom('match', { matchId: 'm2' });

  releaseRoom('match', { matchId: 'm1' });
  expect(emit).not.toHaveBeenCalledWith('leave:match', { matchId: 'm1' });

  releaseRoom('match', { matchId: 'm1' });
  expect(emit).toHaveBeenCalledWith('leave:match', { matchId: 'm1' });
  expect(emit).toHaveBeenCalledTimes(1);

  releaseRoom('match', { matchId: 'm2' });
  expect(emit).toHaveBeenCalledWith('leave:match', { matchId: 'm2' });
  emit.mockRestore();
});

// Screens stack: the bracket stays mounted under a knockout match. When the
// match screen closes, the bracket must keep its live updates.
it('stays connected while any screen holds the socket', () => {
  const connect = jest.spyOn(socket, 'connect').mockReturnValue(socket);
  const disconnect = jest.spyOn(socket, 'disconnect').mockReturnValue(socket);

  acquireSocket(); // the bracket
  acquireSocket(); // a match opened from it
  expect(connect).toHaveBeenCalled();

  releaseSocket(); // back to the bracket
  expect(disconnect).not.toHaveBeenCalled();

  releaseSocket(); // the bracket closes too
  expect(disconnect).toHaveBeenCalledTimes(1);
});
