import type { AppNotification } from '@/api/notifications';
import { NOTIFICATION_ICON, rowContext, splitBySeen, targetHref } from '@/lib/notificationsView';

const n = (id: string, createdAt: string, over: Partial<AppNotification> = {}): AppNotification => ({
  _id: id, kind: 'announcement', title: 't', context: 'Arohance Open', target: { path: '/quick/[id]', params: { id: 'q1' } }, createdAt, ...over,
});

describe('notificationsView', () => {
  it('has an icon for each kind', () => {
    expect(NOTIFICATION_ICON).toEqual({
      entry_approved: 'how_to_reg', entry_rejected: 'cancel', sold: 'gavel',
      match_starting: 'play_circle', announcement: 'campaign', added_to_quick_match: 'group_add', knockout_invite: 'group_add',
    });
  });

  it('splitBySeen puts rows newer than seenAt in fresh, and everything when it is null', () => {
    const list = [n('a', '2026-11-16T10:00:00.000Z'), n('b', '2026-11-16T08:00:00.000Z'), n('c', '2026-11-15T08:00:00.000Z')];
    const r = splitBySeen(list, '2026-11-16T09:00:00.000Z');
    expect(r.fresh.map((x) => x._id)).toEqual(['a']);
    expect(r.earlier.map((x) => x._id)).toEqual(['b', 'c']);
    expect(splitBySeen(list, null)).toEqual({ fresh: list, earlier: [] });
  });

  it('targetHref ignores unknown paths', () => {
    expect(targetHref({ path: '/admin', params: {} })).toBeNull();
    for (const path of ['/category/[categoryId]', '/live/[matchId]', '/tournament/[id]/announcements', '/quick/[id]', '/knockout/[id]']) {
      expect(targetHref({ path, params: { x: '1' } })).toEqual({ pathname: path, params: { x: '1' } });
    }
  });

  it('rowContext ends with the time', () => {
    const now = new Date('2026-11-16T10:00:00.000Z');
    expect(rowContext(n('a', '2026-11-16T09:55:00.000Z'), now)).toBe('Arohance Open · 5 min ago');
  });
});
