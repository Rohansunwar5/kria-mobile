import API from './axios';

/** POST /player/auth/resend-otp — the registration code, sent again. */
export async function resendOtp(email: string): Promise<void> {
  await API.post('/player/auth/resend-otp', { email });
}

/** POST /player/auth/forgot-password — 404 "Player not found." for an unknown
 *  email, 400 "Account not verified." for an unverified one. */
export async function requestPasswordReset(email: string): Promise<void> {
  await API.post('/player/auth/forgot-password', { email });
}

/** POST /player/auth/reset-password — the emailed code plus the new password. */
export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  await API.post('/player/auth/reset-password', { email, otp, newPassword });
}
