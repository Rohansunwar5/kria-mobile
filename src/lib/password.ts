export interface Rule { label: string; met: boolean; required: boolean }

const mixed = (pw: string) => /[^A-Za-z]/.test(pw);

export const passwordOk = (pw: string) => pw.length >= 8;

export function passwordRules(pw: string): Rule[] {
  return [
    { label: 'At least 8 characters', met: passwordOk(pw), required: true },
    { label: 'Add a number or symbol (recommended)', met: mixed(pw), required: false },
  ];
}

/** 0 empty, 1 under 8, 2 is 8+, 3 is 8+ with a number or symbol, 4 is 12+ with a number or symbol. */
export function passwordScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  if (!passwordOk(pw)) return 1;
  if (!mixed(pw)) return 2;
  return pw.length >= 12 ? 4 : 3;
}

export const strengthLabel = (score: number) => ['', 'Too weak', 'Fair', 'Strong', 'Very strong'][score] ?? '';

export const mismatch = (next: string, confirm: string) => confirm.length > 0 && confirm !== next;

export const passwordFormReady = (f: { current: string; next: string; confirm: string }) =>
  !!f.current && passwordOk(f.next) && !!f.confirm && !mismatch(f.next, f.confirm);
