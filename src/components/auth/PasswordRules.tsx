import { View, Text } from 'react-native';
import { Lbl } from '@/components/canvas';
import { Icon } from '@/components/icons';

// ChangePassword.dc.html's strength meter and rule list. set-password is the
// same screen minus the current-password field, so both share this.

export interface Rule { label: string; met: boolean }

export function passwordRules(pw: string): Rule[] {
  return [
    { label: 'At least 8 characters', met: pw.length >= 8 },
    { label: 'One number', met: /\d/.test(pw) },
    { label: 'One symbol', met: /[^A-Za-z0-9]/.test(pw) },
  ];
}

/** 0–4. The fourth block is length ≥ 12 — the artboard draws four blocks and
 *  only fills three for a password that clears every rule. */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  return passwordRules(pw).filter((r) => r.met).length + (pw.length >= 12 ? 1 : 0);
}

const BANDS = [
  { fg: '#FF4438', label: 'Too weak' },
  { fg: '#FF4438', label: 'Too weak' },
  { fg: '#F97316', label: 'Fair' },
  { fg: '#16C46A', label: 'Strong' },
  { fg: '#16C46A', label: 'Very strong' },
];

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  const band = BANDS[score];
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 5, backgroundColor: i < score ? band.fg : 'rgba(255,255,255,0.12)' }} />
        ))}
      </View>
      <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase', color: password ? band.fg : '#7d7d7d', marginTop: 7 }}>
        {password ? band.label : 'Enter a password'}
      </Text>
    </View>
  );
}

export function PasswordRuleList({ password }: { password: string }) {
  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, padding: 13, marginTop: 16 }}>
      <Lbl style={{ marginBottom: 10 }}>Must contain</Lbl>
      {passwordRules(password).map((r, i, all) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: i === all.length - 1 ? 0 : 8 }}>
          <Icon name={r.met ? 'check' : 'close'} size={14} color={r.met ? '#16C46A' : '#7d7d7d'} strokeWidth={r.met ? 2.8 : 2.2} />
          <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: r.met ? '#d4d4d4' : '#7d7d7d' }}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}
