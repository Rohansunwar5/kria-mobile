export interface Rule { label: string; met: boolean }

export function passwordRules(pw: string): Rule[] {
  return [
    { label: 'At least 8 characters', met: pw.length >= 8 },
    { label: 'One number', met: /\d/.test(pw) },
    { label: 'One symbol', met: /[^A-Za-z0-9]/.test(pw) },
  ];
}

/** 0–4. The fourth block is length ≥ 12. */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  return passwordRules(pw).filter((r) => r.met).length + (pw.length >= 12 ? 1 : 0);
}

export const strengthLabel = (score: number) => (score <= 1 ? 'Too weak' : score === 2 ? 'Fair' : score === 3 ? 'Strong' : 'Very strong');

export const mismatch = (next: string, confirm: string) => confirm.length > 0 && confirm !== next;

export const passwordFormReady = (f: { current: string; next: string; confirm: string }) =>
  !!f.current && passwordRules(f.next).every((r) => r.met) && !!f.confirm && !mismatch(f.next, f.confirm);
