import { acquireSocket, releaseSocket, socket } from '@/lib/socket';

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
