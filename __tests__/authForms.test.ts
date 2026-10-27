import {
  phoneDigits, phoneOk, otpDigits, emailOk, dobCheck, citySuggestions, loginErrorMessage, LOGIN_MISMATCH,
} from '@/lib/authForms';

const today = new Date(2026, 9, 23);

describe('authForms', () => {
  it('email', () => {
    expect(emailOk('a@b.co')).toBe(true);
    expect(emailOk('a@b')).toBe(false);
    expect(emailOk('a b@c.co')).toBe(false);
  });
  it('phone and otp digits', () => {
    expect(phoneDigits('98450 21764')).toBe('9845021764');
    expect(phoneDigits('984502176455')).toBe('9845021764');
    // Autofill brings the country code or a trunk zero.
    expect(phoneDigits('+91 98450 21764')).toBe('9845021764');
    expect(phoneDigits('09845021764')).toBe('9845021764');
    expect(phoneDigits('9123456789')).toBe('9123456789');
    expect(phoneOk('984502176')).toBe(false);
    expect(phoneOk('9845021764')).toBe(true);
    expect(otpDigits('12a3456789')).toBe('123456');
  });
  it('dobCheck', () => {
    expect(dobCheck('31', '02', '2001', today)).toEqual({ state: 'invalid' });
    expect(dobCheck('15', '03', '2001', today)).toEqual({ state: 'valid', iso: '2001-03-15', age: 25 });
    expect(dobCheck('15', '03', '20', today)).toEqual({ state: 'incomplete' });
    expect(dobCheck('', '', '', today)).toEqual({ state: 'incomplete' });
    expect(dobCheck('15', '03', '2023', today)).toEqual({ state: 'invalid' });
    expect(dobCheck('15', '03', '1930', today)).toEqual({ state: 'invalid' });
    expect(dobCheck('23', '10', '2021', today)).toMatchObject({ state: 'valid', age: 5 });
    expect(dobCheck('24', '10', '2021', today)).toEqual({ state: 'invalid' });
  });
  it('citySuggestions', () => {
    const t = (city?: string) => ({ venue: { city } });
    expect(citySuggestions([t('Bengaluru'), t(' Bengaluru '), t(''), t(undefined), {}, t('Pune'), t('Delhi'), t('Goa'), t('Agra')]))
      .toEqual(['Bengaluru', 'Pune', 'Delhi', 'Goa']);
    expect(citySuggestions([t('A'), t('B')], 1)).toEqual(['A']);
  });
  it('loginErrorMessage', () => {
    expect(loginErrorMessage(401, 'Unauthorized')).toBe(LOGIN_MISMATCH);
    expect(loginErrorMessage(400, 'Password not set. Please use OTP login.')).toBe('Password not set. Please use OTP login.');
    expect(loginErrorMessage(undefined, undefined)).toBe('Something went wrong');
  });
});
