import { View, Pressable, Text } from 'react-native';
import { colors } from '@/lib/theme';
import type { Portal } from '@/lib/homePortal';

const HALF = {
  flex: 1,
  minHeight: 44,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
};

const TEXT = {
  fontFamily: 'Anton_400Regular' as const,
  fontSize: 16,
  letterSpacing: 0.05 * 16,
  textTransform: 'uppercase' as const,
};

/**
 * The two faces of home. EVENTS is organiser-hosted tournaments and stays the
 * default; PLAY is the player ecosystem.
 *
 * Each side carries its own accent — brand orange for the organiser side,
 * auction magenta for yours — reusing the meanings DESIGN.md §2 already assigns
 * them rather than inventing a third colour.
 */
export function PortalSwitch({
  portal,
  live,
  onChange,
}: {
  portal: Portal;
  live: boolean;
  onChange: (p: Portal) => void;
}) {
  const isPlay = portal === 'play';

  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 13,
        borderWidth: 1.5,
        borderColor: colors.line,
        borderRadius: 5,
        backgroundColor: colors.panel,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="Events"
        accessibilityState={{ selected: !isPlay }}
        onPress={() => { if (isPlay) onChange('events'); }}
        style={{ ...HALF, backgroundColor: isPlay ? 'transparent' : colors.brand }}
      >
        <Text style={{ ...TEXT, color: isPlay ? '#7d7d7d' : colors.ink }}>Events</Text>
      </Pressable>

      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={live ? 'Play, a match is live' : 'Play'}
        accessibilityState={{ selected: isPlay }}
        onPress={() => { if (!isPlay) onChange('play'); }}
        style={{ ...HALF, backgroundColor: isPlay ? colors.auction : 'transparent' }}
      >
        {live ? (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: isPlay ? '#240614' : colors.auction,
            }}
          />
        ) : null}
        <Text style={{ ...TEXT, color: isPlay ? '#240614' : '#7d7d7d' }}>Play</Text>
      </Pressable>
    </View>
  );
}
