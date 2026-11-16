import { useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { pushPermission } from '@/lib/push';
import { getItem } from '@/lib/secureStore';

export const PUSH_ASKED_KEY = 'kria.pushAsked';

/** Home: send a player who was never asked to the notifications ask, once. */
export function usePushAsk() {
  const done = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (done.current) return;
      done.current = true;
      (async () => {
        try {
          if ((await pushPermission()) !== 'undetermined') return;
          if (await getItem(PUSH_ASKED_KEY)) return;
          router.push('/turn-on-notifications');
        } catch {
          // Expo Go or a store error: no ask.
        }
      })();
    }, []),
  );
}
