export interface ProfileFormValues { firstName: string; lastName: string; phone: string; gender: string; dateOfBirth: string; location: string; sport: string }

export function profileUpdate(
  form: ProfileFormValues,
  before: { sport?: string; location?: string },
): { ok: true; data: Record<string, string> } | { ok: false; error: 'First name, last name and phone are required.' } {
  const v = (k: keyof ProfileFormValues) => form[k].trim();
  if (!v('firstName') || !v('lastName') || !v('phone')) return { ok: false, error: 'First name, last name and phone are required.' };
  const data: Record<string, string> = { firstName: v('firstName'), lastName: v('lastName'), phone: v('phone') };
  // The server rejects empty gender / date of birth, so those are left out; sport and city may be cleared with ''.
  for (const k of ['gender', 'dateOfBirth'] as const) if (v(k)) data[k] = v(k);
  for (const k of ['sport', 'location'] as const) if (v(k) || before[k]) data[k] = v(k);
  return { ok: true, data };
}

export function readinessLine({ gender, dateOfBirth }: Pick<ProfileFormValues, 'gender' | 'dateOfBirth'>): string {
  if (!dateOfBirth && !gender) return 'Add your date of birth and gender to enter tournaments.';
  if (!dateOfBirth) return 'Add your date of birth to enter tournaments.';
  if (!gender) return 'Add your gender to enter tournaments.';
  return 'Your profile is ready for tournaments.';
}
