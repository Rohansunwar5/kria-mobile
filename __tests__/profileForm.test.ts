import { needsGuardian, profileUpdate, readinessLine, type ProfileFormValues } from '@/lib/profileForm';

const full: ProfileFormValues = { firstName: ' Priya ', lastName: 'Nair', phone: '98450', gender: 'female', dateOfBirth: '2000-01-01', location: 'Bengaluru', sport: 'badminton' };

describe('profileUpdate', () => {
  it('requires a first name, and keeps a last name and phone once set', () => {
    expect(profileUpdate({ ...full, firstName: ' ' }, {})).toEqual({ ok: false, error: 'First name is required.' });
    expect(profileUpdate({ ...full, phone: '' }, { phone: '98450' })).toEqual({ ok: false, error: 'Phone is required.' });
    expect(profileUpdate({ ...full, firstName: '', lastName: '', phone: '' }, { lastName: 'Nair', phone: '98450' }))
      .toEqual({ ok: false, error: 'First name, last name and phone are required.' });
  });
  // #35: a Google player gives a phone at first entry, so other changes must save without one.
  it('a Google player can save without a phone or last name', () => {
    const r = profileUpdate({ ...full, lastName: '', phone: '' }, {});
    expect(r.ok).toBe(true);
    expect(r.ok && 'lastName' in r.data).toBe(false);
    expect(r.ok && 'phone' in r.data).toBe(false);
  });
  it('sends all seven trimmed keys', () => {
    const r = profileUpdate(full, {});
    expect(r.ok && Object.keys(r.data).sort()).toEqual(['dateOfBirth', 'firstName', 'gender', 'lastName', 'location', 'phone', 'sport']);
    expect(r.ok && r.data.firstName).toBe('Priya');
  });
  // LAUNCH-AUDIT H26: 13 and over; 13–17 need a parent or guardian to agree, once.
  describe('minimum age', () => {
    const today = new Date(2026, 10, 23);
    const born = (age: number) => ({ ...full, dateOfBirth: `${2026 - age}-01-01` });
    it('refuses under 13', () => {
      expect(profileUpdate(born(12), {}, true, today)).toEqual({ ok: false, error: 'Kria is for players 13 and over.' });
    });
    it('asks 13 to 17 for a guardian, and sends the agreement', () => {
      expect(profileUpdate(born(15), {}, false, today)).toEqual({ ok: false, error: 'Players under 18 need a parent or guardian to agree. Turn on the guardian switch.' });
      const r = profileUpdate(born(15), {}, true, today);
      expect(r.ok && r.data.guardianConsent).toBe(true);
    });
    it('knows when the switch is needed', () => {
      expect(needsGuardian(born(15).dateOfBirth, undefined, today)).toBe(true);
      expect(needsGuardian(born(15).dateOfBirth, '2026-01-01', today)).toBe(false);
      expect(needsGuardian(born(12).dateOfBirth, undefined, today)).toBe(false); // refused outright instead
      expect(needsGuardian(born(18).dateOfBirth, undefined, today)).toBe(false);
      expect(needsGuardian('', undefined, today)).toBe(false);
    });
    it('needs no switch once a guardian has agreed, or from 18', () => {
      expect(profileUpdate(born(15), { guardianConsentAt: '2026-01-01' }, false, today).ok).toBe(true);
      const adult = profileUpdate(born(18), {}, false, today);
      expect(adult.ok && 'guardianConsent' in adult.data).toBe(false);
    });
  });
  it('clears a sport the player had', () => {
    const r = profileUpdate({ ...full, sport: '' }, { sport: 'cricket' });
    expect(r.ok && r.data.sport).toBe('');
  });
  it('omits an empty sport or city that was never set', () => {
    const r = profileUpdate({ ...full, sport: '', location: '' }, {});
    expect(r.ok && 'sport' in r.data).toBe(false);
    expect(r.ok && 'location' in r.data).toBe(false);
  });
  it('omits an empty gender and date of birth', () => {
    const r = profileUpdate({ ...full, gender: '', dateOfBirth: '' }, { sport: 'x' });
    expect(r.ok && 'gender' in r.data).toBe(false);
    expect(r.ok && 'dateOfBirth' in r.data).toBe(false);
  });
});

it('readinessLine names what is missing', () => {
  const r = (o: Partial<ProfileFormValues>) => readinessLine({ ...full, ...o });
  expect(r({ gender: '', dateOfBirth: '' })).toBe('Add your date of birth and gender to enter tournaments.');
  expect(r({ gender: 'male', dateOfBirth: '' })).toBe('Add your date of birth to enter tournaments.');
  expect(r({ gender: '', dateOfBirth: '2000-01-01' })).toBe('Add your gender to enter tournaments.');
  expect(r({ phone: '' })).toBe('Add your mobile number to enter tournaments.');
  expect(r({})).toBe('Your profile is ready for tournaments.');
});
