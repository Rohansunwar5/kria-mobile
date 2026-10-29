import API from './axios';
import { setAuth } from '@/lib/storage';

/** Server messages carry the reason a change was rejected — surface them
 *  verbatim rather than a generic failure. */
function reason(e: any, fallback: string): Error {
  return new Error(e?.response?.data?.message || e?.response?.data?.error || fallback);
}

/**
 * The change signs every other device out: the server issues a fresh token and
 * leaves the old ones stale, so this one has to be stored or this device is
 * signed out too on its next request.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    const res = await API.post('/player/auth/change-password', { currentPassword, newPassword });
    const token = res.data?.data?.data?.accessToken ?? res.data?.data?.accessToken;
    if (token) await setAuth(token, 'player');
  } catch (e) {
    throw reason(e, 'Could not change your password.');
  }
}

export async function sendContactMessage(p: {
  fullName: string;
  email: string;
  message: string;
  phone?: string;
}): Promise<void> {
  try {
    await API.post('/contact', {
      fullName: p.fullName,
      email: p.email,
      subject: 'Help from the player app',
      message: p.message,
      iss: 'Kria player app',
      ...(p.phone ? { phoneNumber: p.phone } : {}),
    });
  } catch (e) {
    throw reason(e, 'Could not send your message.');
  }
}
