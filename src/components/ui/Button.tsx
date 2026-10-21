import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font, radius } from '@/constants/theme';
import { Arc } from './Arc';
import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';

/**
 * DESIGN §5.2. One primary per screen; the label says the outcome. `busy`
 * swaps the icon for the Motion arc and the label for its verb-ing form; the
 * button keeps its size. `disabled` is surface2/disabled, never hidden.
 */
export function Button({ label, icon, variant = 'primary', onPress, style, busy, busyLabel, disabled }: {
  label: string;
  icon?: IconName;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
}) {
  const primary = variant === 'primary' && !disabled;
  const ink = disabled ? colors.disabled : primary ? colors.onAccent : colors.text;
  return (
    <Tap
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityLabel={busy ? busyLabel ?? label : label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={[s.base, { backgroundColor: primary ? colors.accent : colors.surface2 }, style]}
    >
      {busy ? (
        <Arc color={ink} track={primary ? colors.onAccentTrack : colors.lineStrong} />
      ) : icon ? (
        <Icon name={icon} size={primary ? 22 : 20} color={ink} variant={primary ? 'b' : 'o'} />
      ) : null}
      <Text style={[s.label, { color: ink, fontFamily: primary ? font.bold : font.semibold }]}>{busy ? busyLabel ?? label : label}</Text>
    </Tap>
  );
}

const s = StyleSheet.create({
  base: { height: 56, borderRadius: radius.button, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontSize: 15 },
});
