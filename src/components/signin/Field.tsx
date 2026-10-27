import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, font, radius } from '@/constants/theme';

/** Sign-in text field: 13/600 label, 54px surface1 input, 1.5 error ring, helper/error line. */
export function Field({ label, helper, error, prefix, right, style, ...input }: TextInputProps & {
  label: string; helper?: string; error?: string; prefix?: string; right?: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.box, !!error && s.err]}>
        {prefix ? <Text style={s.prefix}>{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.text4}
          selectionColor={colors.accent}
          style={[s.input, style]}
          {...input}
        />
        {right}
      </View>
      {error || helper ? <Text style={[s.note, !!error && { color: colors.error }]}>{error ?? helper}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  box: { height: 54, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, borderRadius: radius.input, backgroundColor: colors.surface1 },
  err: { borderWidth: 1.5, borderColor: colors.error },
  prefix: { fontFamily: font.regular, fontSize: 15, color: colors.text3, marginRight: 8 },
  input: { flex: 1, height: '100%', paddingRight: 16, color: colors.text, fontFamily: font.regular, fontSize: 15 },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
});
