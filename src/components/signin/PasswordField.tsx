import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '@/constants/theme';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import type { Rule } from '@/lib/password';
import { Field } from './Field';

export function PasswordField({ label, value, onChangeText, placeholder, isNew }: {
  label: string; value: string; onChangeText: (s: string) => void; placeholder?: string; isNew?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <Field
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={!shown}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType={isNew ? 'newPassword' : 'password'}
      autoComplete={isNew ? 'new-password' : 'current-password'}
      right={
        <Tap scale={0.95} accessibilityLabel={shown ? 'Hide password' : 'Show password'} onPress={() => setShown((v) => !v)} style={s.eye}>
          <Icon name={shown ? 'visibility_off' : 'visibility'} size={20} color={colors.text3} />
        </Tap>
      }
    />
  );
}

export function RuleList({ rules }: { rules: Rule[] }) {
  return (
    <View style={{ gap: 10 }}>
      {rules.map((r) => (
        <View key={r.label} style={s.rule}>
          <View style={[s.dot, r.met ? { backgroundColor: colors.text } : { borderWidth: 1.5, borderColor: r.required ? colors.ring : colors.cardLine }]}>
            {r.met ? <Icon name="check" variant="b" size={12} color={colors.onAccent} /> : null}
          </View>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: r.met ? colors.text : r.required ? colors.text3 : colors.text4 }}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  eye: { width: 44, height: 44, marginRight: 5, alignItems: 'center', justifyContent: 'center' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
