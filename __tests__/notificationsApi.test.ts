import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getNotifications, getUnreadCount, markNotificationsRead, savePushToken, removePushToken } from '@/api/notifications';

describe('notifications api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('lists notifications, unwrapping the payload', async () => {
    mock.onGet('/player/notifications').reply(200, { data: { data: { notifications: [{ _id: 'n1' }], seenAt: '2026-11-01T00:00:00.000Z' } } });
    const res = await getNotifications();
    expect(res.notifications).toHaveLength(1);
    expect(res.seenAt).toBe('2026-11-01T00:00:00.000Z');
    expect(mock.history.get[0].params).toBeUndefined();
  });

  it('pages with before', async () => {
    mock.onGet('/player/notifications').reply(200, { data: { data: { notifications: [], seenAt: null } } });
    await getNotifications('2026-11-01T00:00:00.000Z');
    expect(mock.history.get[0].params).toEqual({ before: '2026-11-01T00:00:00.000Z' });
  });

  it('falls back to an empty list on a missing body', async () => {
    mock.onGet('/player/notifications').reply(200, {});
    expect(await getNotifications()).toEqual({ notifications: [], seenAt: null });
  });

  it('reads the unread count', async () => {
    mock.onGet('/player/notifications/unread-count').reply(200, { data: { data: { count: 3 } } });
    expect(await getUnreadCount()).toBe(3);
  });

  it('marks read with a POST', async () => {
    mock.onPost('/player/notifications/read').reply(200, { data: { data: { seenAt: 'x' } } });
    await markNotificationsRead();
    expect(mock.history.post).toHaveLength(1);
  });

  it('marks read up to the newest loaded row', async () => {
    mock.onPost('/player/notifications/read').reply(200, {});
    await markNotificationsRead('2026-11-01T00:00:00.000Z');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ upTo: '2026-11-01T00:00:00.000Z' });
  });

  it('saves the push token', async () => {
    mock.onPost('/player/auth/fcm-token').reply(200, {});
    await savePushToken('ExponentPushToken[x]');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ token: 'ExponentPushToken[x]' });
  });

  it('removes the push token with a DELETE body', async () => {
    mock.onDelete('/player/auth/fcm-token').reply(200, {});
    await removePushToken('ExponentPushToken[x]');
    expect(JSON.parse(mock.history.delete[0].data)).toEqual({ token: 'ExponentPushToken[x]' });
    expect(mock.history.delete[0].timeout).toBe(3000);
  });
});
