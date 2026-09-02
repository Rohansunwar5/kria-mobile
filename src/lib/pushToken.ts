import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * The device push token the server stores as an "fcmToken".
 *
 * Returns null when there is nothing to register — permission refused, a
 * simulator, or Expo Go on Android, which cannot receive remote push. Callers
 * must treat null as "not available" and say so, rather than showing a toggle
 * that silently does nothing.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Kria',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === 'string' ? token.data : null;
  } catch {
    return null;
  }
}
