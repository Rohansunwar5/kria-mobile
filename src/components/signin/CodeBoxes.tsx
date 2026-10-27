import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, display, radius } from '@/constants/theme';

/** Six boxes over one invisible input, so autofill and paste deliver the whole code at once. */
export function CodeBoxes({ value, onChange, autoFocus }: { value: string; onChange: (digits: string) => void; autoFocus?: boolean }) {
  const ref = useRef<TextInput>(null);
  const [focus, setFocus] = useState(!!autoFocus);
  return (
    <Pressable accessible={false} onPress={() => ref.current?.focus()} style={s.row}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} testID="code-box" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.box, value[i] ? s.filled : focus && i === value.length && s.active]}>
          <Text style={s.digit}>{value[i] ?? ''}</Text>
        </View>
      ))}
      <TextInput
        ref={ref}
        accessibilityLabel="Verification code"
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        caretHidden
        style={s.hidden}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: { flex: 1, maxWidth: 60, height: 60, borderRadius: radius.input, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  // 5d: the next box to fill has a text ring, filled boxes a ring ring.
  active: { borderWidth: 1.5, borderColor: colors.text },
  filled: { borderWidth: 1.5, borderColor: colors.ring },
  digit: display(30),
  hidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent' },
});
