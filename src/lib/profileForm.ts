import { andList, profileGap } from '@/lib/entryView';

export interface ProfileFormValues { firstName: string; lastName: string; phone: string; gender: string; dateOfBirth: string; location: string; sport: string }

/**
 * A first name is always required. A last name and phone are kept once set,
 * but a Google player (#35) may have neither yet and still save other changes;
 * the entry screen asks for them.
 */
export function profileUpdate(
  form: ProfileFormValues,
  before: { sport?: string; location?: string; lastName?: string; phone?: string },
): { ok: true; data: Record<string, string> } | { ok: false; error: string } {
  const v = (k: keyof ProfileFormValues) => form[k].trim();
  const missing = [
    !v('firstName') && 'first name',
    before.lastName && !v('lastName') && 'last name',
    before.phone && !v('phone') && 'phone',
  ].filter((m): m is string => !!m);
  if (missing.length) {
    const list = andList(missing);
    return { ok: false, error: `${list[0].toUpperCase()}${list.slice(1)} ${missing.length > 1 ? 'are' : 'is'} required.` };
  }
  const data: Record<string, string> = { firstName: v('firstName') };
  // The server rejects empty strings for these, so an empty one is left out; sport and city may be cleared with ''.
  for (const k of ['lastName', 'phone', 'gender', 'dateOfBirth'] as const) if (v(k)) data[k] = v(k);
  for (const k of ['sport', 'location'] as const) if (v(k) || before[k]) data[k] = v(k);
  return { ok: true, data };
}

/** Under Edit profile: what tournament entry still needs, in the entry screen's words. */
export function readinessLine(form: Pick<ProfileFormValues, 'lastName' | 'phone' | 'gender' | 'dateOfBirth'>): string {
  const gap = profileGap(form);
  return gap ? `${gap} tournaments.` : 'Your profile is ready for tournaments.';
}
