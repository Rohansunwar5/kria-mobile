import API from './axios';
import { unwrap } from './unwrap';

export type NotificationKind =
  | 'entry_approved'
  | 'entry_rejected'
  | 'sold'
  | 'match_starting'
  | 'announcement'
  | 'added_to_quick_match';

export type AppNotification = {
  _id: string;
  kind: NotificationKind;
  title: string;
  detail?: string;
  context: string;
  target: { path: string; params: Record<string, string> };
  createdAt: string;
};

export async function getNotifications(before?: string): Promise<{ notifications: AppNotification[]; seenAt: string | null }> {
  const res = await API.get('/player/notifications', before ? { params: { before } } : undefined);
  const d = unwrap<{ notifications?: AppNotification[]; seenAt?: string | null } | null>(res);
  return { notifications: d?.notifications ?? [], seenAt: d?.seenAt ?? null };
}

export async function getUnreadCount(): Promise<number> {
  const res = await API.get('/player/notifications/unread-count');
  return unwrap<{ count?: number } | null>(res)?.count ?? 0;
}

export async function markNotificationsRead(upTo?: string): Promise<void> {
  await API.post('/player/notifications/read', upTo ? { upTo } : undefined);
}

// The route and field are named for FCM, a leftover; the value is an Expo push token.
export async function savePushToken(token: string): Promise<void> {
  await API.post('/player/auth/fcm-token', { token });
}

export async function removePushToken(token: string): Promise<void> {
  await API.delete('/player/auth/fcm-token', { data: { token }, timeout: 3000 });
}
