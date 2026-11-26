import type { AppNotification, NotificationKind } from '@/api/notifications';
import type { IconName } from '@/components/ui/Icon';
import { timeAgo } from '@/lib/tournamentView';

export const NOTIFICATION_ICON: Record<NotificationKind, IconName> = {
  entry_approved: 'how_to_reg',
  entry_rejected: 'cancel',
  sold: 'gavel',
  match_starting: 'play_circle',
  announcement: 'campaign',
  added_to_quick_match: 'group_add',
  knockout_invite: 'group_add',
};

/** Rows newer than `seenAt` are new; a player who never opened the screen has only new ones. */
export function splitBySeen(list: AppNotification[], seenAt: string | null) {
  const seen = seenAt ? new Date(seenAt).getTime() : -Infinity;
  const fresh = list.filter((n) => new Date(n.createdAt).getTime() > seen);
  return { fresh, earlier: list.filter((n) => !fresh.includes(n)) };
}

const OPENABLE = ['/category/[categoryId]', '/live/[matchId]', '/tournament/[id]/announcements', '/quick/[id]', '/knockout/[id]'];

/** The server picks the path, but the app only opens screens it knows. */
export function targetHref(t: AppNotification['target']): { pathname: string; params: Record<string, string> } | null {
  return OPENABLE.includes(t.path) ? { pathname: t.path, params: t.params } : null;
}

export const rowContext = (n: AppNotification, now: Date) => `${n.context} · ${timeAgo(n.createdAt, now)}`;
