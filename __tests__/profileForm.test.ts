import { profileUpdate, readinessLine, type ProfileFormValues } from '@/lib/profileForm';

const full: ProfileFormValues = { firstName: ' Priya ', lastName: 'Nair', phone: '98450', gender: 'female', dateOfBirth: '2000-01-01', location: 'Bengaluru', sport: 'badminton' };

describe('profileUpdate', () => {
  it('requires name and phone', () => {
    expect(profileUpdate({ ...full, firstName: ' ' }, {})).toEqual({ ok: false, error: 'First name, last name and phone are required.' });
  });
  it('sends all seven trimmed keys', () => {
    const r = profileUpdate(full, {});
    expect(r.ok && Object.keys(r.data).sort()).toEqual(['dateOfBirth', 'firstName', 'gender', 'lastName', 'location', 'phone', 'sport']);
    expect(r.ok && r.data.firstName).toBe('Priya');
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
  expect(readinessLine({ gender: '', dateOfBirth: '' })).toBe('Add your date of birth and gender to enter tournaments.');
  expect(readinessLine({ gender: 'male', dateOfBirth: '' })).toBe('Add your date of birth to enter tournaments.');
  expect(readinessLine({ gender: '', dateOfBirth: '2000-01-01' })).toBe('Add your gender to enter tournaments.');
  expect(readinessLine({ gender: 'male', dateOfBirth: '2000-01-01' })).toBe('Your profile is ready for tournaments.');
});
