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
    if ((e as any)?.response?.status === 401) throw new Error('Current password is incorrect.');
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
