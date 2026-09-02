import API from './axios';

/** POST /player/auth/resend-otp — the registration code, sent again. */
export async function resendOtp(email: string): Promise<void> {
  await API.post('/player/auth/resend-otp', { email });
}

/** POST /player/auth/forgot-password — always resolves for an unknown address,
 *  so the screen must not claim the account exists. */
export async function requestPasswordReset(email: string): Promise<void> {
  await API.post('/player/auth/forgot-password', { email });
}
