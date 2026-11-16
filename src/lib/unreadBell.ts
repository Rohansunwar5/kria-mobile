import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getUnreadCount } from '@/api/notifications';

/** Unread count for the Home bell: refetched on focus and when a push arrives. */
export function useUnreadCount() {
  const [count, setCount] = useState(0);
  // A failed fetch keeps the last count.
  const refresh = useCallback(() => { getUnreadCount().then(setCount, () => {}); }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => app.remove();
  }, [refresh]);
  useEffect(() => {
    try {
      const sub = Notifications.addNotificationReceivedListener(refresh);
      return () => sub.remove();
    } catch {
      return undefined; // Expo Go
    }
  }, [refresh]);
  return { count, refresh };
}
