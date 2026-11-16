import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { targetHref } from '@/lib/notificationsView';

/**
 * Opens the screen a tapped push points at, live and at launch. `canOpen`: signed in, onboarding done and the
 * gate has routed. A tap that arrives earlier waits (newest wins) instead of being redirected away.
 */
export function usePushOpen(canOpen: boolean) {
  const router = useRouter();
  const pending = useRef<Notifications.NotificationResponse | null>(null);
  const handled = useRef<string | null>(null);
  const can = useRef(canOpen);

  const flush = useCallback(() => {
    const r = pending.current;
    if (!r || !can.current) return;
    pending.current = null;
    const id = r.notification.request.identifier;
    const d = r.notification.request.content.data as { path?: string; params?: Record<string, string> } | undefined;
    if (!d?.path || id === handled.current) return;
    handled.current = id;
    try { Notifications.clearLastNotificationResponse(); } catch { /* Expo Go */ }
    try {
      const href = targetHref({ path: d.path, params: d.params ?? {} });
      if (href) router.push(href as never);
    } catch {
      // A failed open must not become an unhandled rejection.
    }
  }, [router]);

  const take = useCallback((r: Notifications.NotificationResponse | null) => {
    if (!r) return;
    pending.current = r;
    flush();
  }, [flush]);

  useEffect(() => {
    try {
      take(Notifications.getLastNotificationResponse());
      const sub = Notifications.addNotificationResponseReceivedListener(take);
      return () => sub.remove();
    } catch {
      return undefined; // Expo Go
    }
  }, [take]);

  useEffect(() => {
    can.current = canOpen;
    flush();
  }, [canOpen, flush]);
}
