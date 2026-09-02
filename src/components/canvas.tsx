import { View, Text, Pressable, ViewStyle, TextStyle } from 'react-native';
import { Icon, type IconName } from '@/components/icons';

// Texture and control primitives from _head.html that aren't states or tags.
// The CSS originals are repeating-linear-gradients; RN has no repeating
// gradient, so both are drawn as rows of skewed bars — same 115deg, same
// periods. Cheap enough to render, and they carry most of the "industrial"
// read of the design.

const SKEW = '-25deg'; // 115deg gradient axis → stripes 25deg off vertical
const BARS = 60; // covers 1080px — wider than any phone

/** `.hazard` — the 5px orange rule under the masthead. */
export function Hazard({ height = 5 }: { height?: number }) {
  return (
    <View style={{ height, overflow: 'hidden', flexDirection: 'row' }} pointerEvents="none">
      {Array.from({ length: BARS }, (_, i) => (
        <View
          key={i}
          style={{
            width: 9,
            marginRight: 9,
            height: height * 3,
            marginTop: -height,
            backgroundColor: 'rgba(249,115,22,0.9)',
            transform: [{ skewX: SKEW }],
          }}
        />
      ))}
    </View>
  );
}

/** `.hairlines` — faint diagonal texture behind hero blocks. Absolutely
 *  positioned; drop it inside a relative, clipped parent. */
export function Hairlines() {
  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', overflow: 'hidden' }}
      pointerEvents="none"
    >
      {Array.from({ length: 200 }, (_, i) => (
        <View
          key={i}
          style={{
            width: 1,
            marginRight: 6,
            height: '300%',
            marginTop: '-100%',
            backgroundColor: 'rgba(255,255,255,0.05)',
            transform: [{ skewX: SKEW }],
          }}
        />
      ))}
    </View>
  );
}

/** `.chip` — filters and sorts. Cricket's leaderboard uses seven of these,
 *  one per API sort key. */
export function Chip({
  label,
  selected,
  variant = 'brand',
  tone,
  onPress,
  icon,
  style,
}: {
  label: string;
  selected?: boolean;
  /** `auction` is the magenta "you" chip. */
  variant?: 'brand' | 'auction';
  /** Keyline + label colour when unselected — the artboard's red Retry chip. */
  tone?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  const on = selected
    ? variant === 'auction'
      ? { bg: '#FA4C93', fg: '#240614' }
      : { bg: '#F97316', fg: '#0B0B0B' }
    : { bg: 'transparent', fg: tone ?? '#bdbdbd' };

  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 3,
          backgroundColor: on.bg,
          ...(selected ? null : { borderWidth: 1.5, borderColor: tone ?? 'rgba(255,255,255,0.16)' }),
          ...(onPress ? { minHeight: 44, justifyContent: 'center' } : null), // hit target
        },
        style as any,
      ]}
    >
      {icon}
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 10,
          letterSpacing: 0.1 * 10,
          textTransform: 'uppercase',
          color: on.fg,
        }}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      {body}
    </Pressable>
  );
}

/** `.lbl` — mono 9px caps, the field/section label used on every screen. */
export function Lbl({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return (
    <Text style={[{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d' }, style as any]}>
      {children}
    </Text>
  );
}

/** `.kick` — same shape as `.lbl` but brand-coloured and wider tracked. */
export function Kick({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return (
    <Text style={[{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#F97316' }, style as any]}>
      {children}
    </Text>
  );
}

/** `.btnx` (primary) and `.btnk` (keyline). Disabled is the artboard's
 *  translucent-brand state, not a grey box. */
export function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  arrow,
  height,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  busy?: boolean;
  arrow?: boolean;
  height?: number;
  style?: ViewStyle;
}) {
  const off = !!(disabled || busy);
  const ghost = variant === 'ghost';
  const fg = ghost ? '#fff' : off ? 'rgba(11,11,11,0.55)' : '#0B0B0B';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={onPress}
      style={[
        {
          height: height ?? 54,
          borderRadius: 5,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          backgroundColor: ghost ? 'transparent' : off ? 'rgba(249,115,22,0.35)' : '#F97316',
          ...(ghost ? { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)' } : null),
        },
        style as any,
      ]}
    >
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: ghost ? 15 : 17, letterSpacing: 0.04 * 17, color: fg }}>
        {busy ? 'Working…' : label}
      </Text>
      {arrow && !busy ? <Icon name="arrow-right" size={19} color={fg} strokeWidth={2.8} /> : null}
    </Pressable>
  );
}

/** `.iconbtn` — 38px square, 44px hit target via hitSlop. */
export function IconBtn({
  icon,
  onPress,
  label,
  size = 19,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 38,
        height: 38,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={size} color="#fff" strokeWidth={2.3} />
    </Pressable>
  );
}

/** `.hdr` — back button, Anton title, optional subtitle and right slot. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  border = true,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  border?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        ...(border ? { borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' } : null),
      }}
    >
      {onBack ? <IconBtn icon="chevron-left" label="Go back" onPress={onBack} /> : null}
      <View style={{ flex: 1 }}>
        {title ? (
          <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: subtitle ? 17 : 18, lineHeight: subtitle ? 16 : 20, color: '#fff' }}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
