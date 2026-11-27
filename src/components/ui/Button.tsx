import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors, ease, font, motion, radius, spring } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { Arc } from './Arc';
import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';

const LIP = 4;

type Props = {
  label: string;
  icon?: IconName;
  /** A mark that isn't a Material icon (the Google "G"), in the icon's place. */
  lead?: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
};

/**
 * DESIGN §5.2. One primary per screen; the label says the outcome. `busy`
 * swaps the icon for the Motion arc and the label for its verb-ing form; the
 * button keeps its size. `disabled` is surface2/disabled, never hidden.
 * v1.2: a live primary sits on a 4px `accentLip` edge and presses down into it.
 */
export function Button(props: Props) {
  const { variant = 'primary', disabled } = props;
  if (variant === 'primary' && !disabled) return <PrimaryButton {...props} />;
  const { label, onPress, style, busy, busyLabel } = props;
  const ink = disabled ? colors.disabled : colors.text;
  return (
    <Tap
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityLabel={busy ? busyLabel ?? label : label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={[s.base, s.row, { backgroundColor: colors.surface2 }, style]}
    >
      <Content label={props.label} icon={props.icon} lead={props.lead} busy={props.busy} busyLabel={props.busyLabel} ink={ink} primary={false} />
    </Tap>
  );
}

/**
 * The face is the outer height minus the lip, so no layout moves. Press-in
 * travels the face down over the lip in 100ms; release springs back (snappy).
 * Reduced motion: no travel, the face dims while held.
 */
function PrimaryButton(props: Props) {
  const { label, onPress, style, busy, busyLabel } = props;
  const reduced = useReducedMotion();
  const down = useSharedValue(0);
  const face = useAnimatedStyle(() =>
    reduced ? { opacity: 1 - down.get() * 0.2 } : { transform: [{ translateY: down.get() * LIP }] },
  );
  // Padding belongs to the face's content; the outer box only sizes the button.
  const { padding, paddingHorizontal, paddingLeft, paddingRight, ...outer }: ViewStyle = StyleSheet.flatten([s.base, style]) ?? {};
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={busy}
      accessibilityLabel={busy ? busyLabel ?? label : label}
      accessibilityState={{ disabled: false, busy: !!busy }}
      onPressIn={() => {
        haptics.press();
        down.set(withTiming(1, { duration: motion.fast, easing: ease.standard }));
      }}
      onPressOut={() => {
        down.set(reduced ? withTiming(0, { duration: motion.fast }) : withSpring(0, spring.snappy));
      }}
      style={[outer, s.shell]}
    >
      <Animated.View testID="button-lip" style={s.lip} />
      <Animated.View style={[s.face, s.row, { padding, paddingHorizontal, paddingLeft, paddingRight }, face]}>
        <Content label={props.label} icon={props.icon} lead={props.lead} busy={props.busy} busyLabel={props.busyLabel} ink={colors.onAccent} primary />
      </Animated.View>
    </Pressable>
  );
}

function Content({ label, icon, lead, busy, busyLabel, ink, primary }: Pick<Props, "label" | "icon" | "lead" | "busy" | "busyLabel"> & { ink: string; primary: boolean }) {
  return (
    <>
      {busy ? (
        <Arc color={ink} track={primary ? colors.onAccentTrack : colors.lineStrong} />
      ) : icon ? (
        <Icon name={icon} size={primary ? 22 : 20} color={ink} variant={primary ? 'b' : 'o'} />
      ) : lead ?? null}
      <Text maxFontSizeMultiplier={1.3} style={[s.label, { color: ink, fontFamily: primary ? font.bold : font.semibold }]}>{busy ? busyLabel ?? label : label}</Text>
    </>
  );
}

const s = StyleSheet.create({
  base: { height: 56, borderRadius: radius.button },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shell: { backgroundColor: 'transparent' },
  lip: { position: 'absolute', left: 0, right: 0, top: LIP, bottom: 0, borderRadius: radius.button, backgroundColor: colors.accentLip },
  face: { flex: 1, marginBottom: LIP, borderRadius: radius.button, backgroundColor: colors.accent },
  label: { fontSize: 15 },
});
