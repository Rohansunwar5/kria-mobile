import { View, Text, Pressable, ViewStyle } from 'react-native';

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
  onPress,
  icon,
  style,
}: {
  label: string;
  selected?: boolean;
  /** `auction` is the magenta "you" chip. */
  variant?: 'brand' | 'auction';
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  const on = selected
    ? variant === 'auction'
      ? { bg: '#FA4C93', fg: '#240614' }
      : { bg: '#F97316', fg: '#0B0B0B' }
    : { bg: 'transparent', fg: '#bdbdbd' };

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
          ...(selected ? null : { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)' }),
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
