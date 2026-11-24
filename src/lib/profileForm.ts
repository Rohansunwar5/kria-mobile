import { ageAt, andList, profileGap } from '@/lib/entryView';
import { MIN_AGE } from '@/lib/authForms';

export const GUARDIAN_NEEDED = 'Players under 18 need a parent or guardian to agree. Turn on the guardian switch.';
export const GUARDIAN_LABEL = 'My parent or guardian agrees';
export const GUARDIAN_HINT = "Players under 18 need a parent or guardian's OK to use Kria and enter tournaments.";

/** A date of birth that makes the player 13-17, with no guardian agreement on record yet (LAUNCH-AUDIT H26). */
export function needsGuardian(dob: string, consentAt?: string, today = new Date()): boolean {
  if (!dob || consentAt) return false;
  const age = ageAt(dob, today);
  return age >= MIN_AGE && age < 18;
}

export interface ProfileFormValues { firstName: string; lastName: string; phone: string; gender: string; dateOfBirth: string; location: string; sport: string }

/**
 * A first name is always required. A last name and phone are kept once set,
 * but a Google player (#35) may have neither yet and still save other changes;
 * the entry screen asks for them.
 */
export function profileUpdate(
  form: ProfileFormValues,
  before: { sport?: string; location?: string; lastName?: string; phone?: string; guardianConsentAt?: string },
  guardianConsent = false,
  today = new Date(),
): { ok: true; data: Record<string, string | boolean> } | { ok: false; error: string } {
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
  // LAUNCH-AUDIT H26: 13 and over; 13-17 need a parent or guardian to agree, once.
  if (v('dateOfBirth') && ageAt(v('dateOfBirth'), today) < MIN_AGE) return { ok: false, error: `Kria is for players ${MIN_AGE} and over.` };
  const guardian = needsGuardian(v('dateOfBirth'), before.guardianConsentAt, today);
  if (guardian && !guardianConsent) return { ok: false, error: GUARDIAN_NEEDED };
  const data: Record<string, string | boolean> = { firstName: v('firstName') };
  if (guardian) data.guardianConsent = true;
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
