import API from './axios';

/** Server messages carry the reason a change was rejected — surface them
 *  verbatim rather than a generic failure. */
function reason(e: any, fallback: string): Error {
  return new Error(e?.response?.data?.message || e?.response?.data?.error || fallback);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await API.post('/player/auth/change-password', { currentPassword, newPassword });
  } catch (e) {
    throw reason(e, 'Could not change your password.');
  }
}

export async function sendContactMessage(payload: {
  name: string;
  email: string;
  message: string;
  phone?: string;
}): Promise<void> {
  try {
    await API.post('/contact', payload);
  } catch (e) {
    throw reason(e, 'Could not send your message.');
  }
}

export async function registerFcmToken(token: string): Promise<void> {
  await API.post('/player/auth/fcm-token', { fcmToken: token });
}

export async function unregisterFcmToken(token: string): Promise<void> {
  await API.delete('/player/auth/fcm-token', { data: { fcmToken: token } });
}
