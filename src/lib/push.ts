import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import Constants from 'expo-constants';
import { savePushToken, releasePushToken } from '@/api/notifications';

type Permission = 'granted' | 'denied' | 'undetermined';

let savedToken: string | null = null;
let savedFor: string | null = null; // another player signing in must save again

export async function pushPermission(): Promise<Permission> {
  return (await Notifications.getPermissionsAsync()).status as Permission;
}

export async function canAskAgain(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).canAskAgain;
}

export async function askPushPermission(): Promise<boolean> {
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

/** Never throws: Expo Go on Android cannot get a token, and that is fine. Asks no permission. */
export async function registerPushToken(playerId: string): Promise<string | null> {
  if (savedToken && savedFor === playerId) return savedToken; // already registered: no repeat POST on every foreground
  try {
    if ((await pushPermission()) !== 'granted') return null;
    // A no-op on iOS.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: AndroidImportance.HIGH,
    });
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(data);
    savedToken = data;
    savedFor = playerId;
    return data;
  } catch {
    return null;
  }
}

/** Every logout runs this (the `logout` thunk). Never throws. */
export async function unregisterPushToken(): Promise<void> {
  let token = savedToken;
  savedToken = null;
  savedFor = null;
  try {
    // This session may never have saved one (or logged out mid-registration): remove this device's token anyway.
    if (!token && (await pushPermission()) === 'granted') {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (projectId) token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    }
    if (token) await releasePushToken(token);
  } catch {
    // Logging out must not wait on a failed cleanup.
  }
}

export function configurePushHandling(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
