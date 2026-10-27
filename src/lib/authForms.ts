export const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
// Autofill can bring "+91 " or a trunk 0; drop it only when 10 digits follow.
export const phoneDigits = (s: string) => s.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '').slice(0, 10);
export const phoneOk = (s: string) => /^\d{10}$/.test(s);
export const otpDigits = (s: string) => s.replace(/\D/g, '').slice(0, 6);

type Dob = { state: 'incomplete' } | { state: 'invalid' } | { state: 'valid'; iso: string; age: number };

export function dobCheck(dd: string, mm: string, yyyy: string, today: Date): Dob {
  if (!dd || !mm || yyyy.length < 4) return { state: 'incomplete' };
  const d = Number(dd), m = Number(mm), y = Number(yyyy);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d || y <= 1930) return { state: 'invalid' };
  let age = today.getFullYear() - y;
  if (today.getMonth() < m - 1 || (today.getMonth() === m - 1 && today.getDate() < d)) age--;
  if (age < 5) return { state: 'invalid' };
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return { state: 'valid', iso: `${p(y, 4)}-${p(m)}-${p(d)}`, age };
}

export function citySuggestions(tournaments: { venue?: { city?: string } }[], max = 4): string[] {
  const out: string[] = [];
  for (const t of tournaments) {
    const c = t.venue?.city?.trim();
    if (c && !out.includes(c)) out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

export const LOGIN_MISMATCH = "That email and password don't match.";
export function loginErrorMessage(status: number | undefined, serverMessage: string | undefined): string {
  return status === 401 ? LOGIN_MISMATCH : serverMessage || 'Something went wrong';
}
