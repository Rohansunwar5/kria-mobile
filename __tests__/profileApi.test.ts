import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getPublicPlayer, getTeam, getTeamRoster, listAnnouncements } from '@/api/profileApi';
import { changePassword, sendContactMessage, registerFcmToken, unregisterFcmToken } from '@/api/settings';
import { groupMenu } from '@/lib/profileMenu';

describe('public profile and team api', () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(API);
  });
  afterEach(() => {
    mock.restore();
  });

  it('getPublicPlayer returns the player and their history', async () => {
    mock.onGet('/player/auth/public/p1').reply(200, {
      data: { data: { player: { _id: 'p1', firstName: 'A', lastName: 'K', titles: [] }, history: [{ _id: 'h1' }] } },
    });
    const res = await getPublicPlayer('p1');
    expect(res?.player.firstName).toBe('A');
    expect(res?.history).toHaveLength(1);
  });

  it('getPublicPlayer returns null for an unknown player rather than throwing', async () => {
    mock.onGet('/player/auth/public/nope').reply(404);
    expect(await getPublicPlayer('nope')).toBeNull();
  });

  it('getTeam unwraps a team', async () => {
    mock.onGet('/teams/t1').reply(200, { data: { data: { _id: 't1', name: 'Thunder Blazers' } } });
    expect((await getTeam('t1'))?.name).toBe('Thunder Blazers');
  });

  it('getTeamRoster falls back to an empty roster', async () => {
    mock.onGet('/registrations/teams/t1/roster').reply(200, { data: { data: { players: [{ _id: 'r1' }] } } });
    expect(await getTeamRoster('t1')).toHaveLength(1);
    mock.onGet('/registrations/teams/t2/roster').reply(200, {});
    expect(await getTeamRoster('t2')).toEqual([]);
  });

  it('listAnnouncements puts pinned notices first, then newest', async () => {
    mock.onGet('/tournaments/t1/announcements').reply(200, {
      data: {
        data: [
          { _id: 'a', message: 'old', pinned: false, createdAt: '2026-01-01T00:00:00Z' },
          { _id: 'b', message: 'new', pinned: false, createdAt: '2026-02-01T00:00:00Z' },
          { _id: 'c', message: 'pinned', pinned: true, createdAt: '2025-01-01T00:00:00Z' },
        ],
      },
    });
    expect((await listAnnouncements('t1')).map((a) => a._id)).toEqual(['c', 'b', 'a']);
  });
});

describe('settings api', () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(API);
  });
  afterEach(() => {
    mock.restore();
  });

  it('changePassword posts both passwords', async () => {
    let body: any;
    mock.onPost('/player/auth/change-password').reply((cfg) => {
      body = JSON.parse(cfg.data);
      return [200, { data: {} }];
    });
    await changePassword('old1', 'new1');
    expect(body).toEqual({ currentPassword: 'old1', newPassword: 'new1' });
  });

  it('surfaces the server message when a password change is rejected', async () => {
    mock.onPost('/player/auth/change-password').reply(400, { message: 'Current password is incorrect.' });
    await expect(changePassword('bad', 'new1')).rejects.toThrow('Current password is incorrect.');
  });

  it('sendContactMessage posts the lead', async () => {
    let body: any;
    mock.onPost('/contact').reply((cfg) => {
      body = JSON.parse(cfg.data);
      return [200, { data: {} }];
    });
    await sendContactMessage({ name: 'R', email: 'r@k.club', message: 'help' });
    expect(body.message).toBe('help');
  });

  it('registers and unregisters a push token', async () => {
    mock.onPost('/player/auth/fcm-token').reply(200, { data: {} });
    mock.onDelete('/player/auth/fcm-token').reply(200, { data: {} });
    await expect(registerFcmToken('tok')).resolves.toBeUndefined();
    await expect(unregisterFcmToken('tok')).resolves.toBeUndefined();
  });
});

describe('groupMenu', () => {
  it('splits the flat menu into Playing and Account', () => {
    const groups = groupMenu();
    expect(groups.map((g) => g.title)).toEqual(['Playing', 'Account']);
  });

  it('keeps registrations, history and invoices under Playing', () => {
    const playing = groupMenu().find((g) => g.title === 'Playing')!;
    expect(playing.items.map((i) => i.label)).toEqual(['My entries', 'Tournament history', 'Payments']);
  });

  it('drops the redundant Find Tournaments row — the Events tab is one tap away', () => {
    const labels = groupMenu().flatMap((g) => g.items.map((i) => i.label));
    expect(labels).not.toContain('Find Tournaments');
  });

  it('keeps log out out of the groups so it can sit apart', () => {
    const labels = groupMenu().flatMap((g) => g.items.map((i) => i.label));
    expect(labels).not.toContain('Log out');
  });
});
