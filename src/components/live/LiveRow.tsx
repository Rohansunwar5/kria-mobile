import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme';
import type { LiveItem } from '@/api/live';

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.12 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

/**
 * One live match, either kind.
 *
 * The left edge separates them — brand for a tournament match, auction for a
 * quick one, reusing the accent the PLAY portal already gives the player
 * ecosystem. The edge is NOT the only signal: the tag carries the word too,
 * because DESIGN.md §7 says colour never stands alone.
 */
export default function LiveRow({ item }: { item: LiveItem }) {
  const theme = useTheme();
  const isQuick = item.kind === 'quick';

  // A sport that has not implemented summariseForFeed yields a row with no
  // title. That is deliberate on the server, so this must render rather than
  // show a blank card — fall back to the one thing every row always has.
  const heading = item.kind === 'tournament'
    ? (item.tournamentName ?? item.title ?? item.sport)
    : (item.title ?? item.sport);

  const sub = item.kind === 'tournament'
    ? [item.sport, item.categoryName, item.round].filter(Boolean).join(' · ')
    : item.sport;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${heading}, live`}
      onPress={() => router.push(isQuick ? `/quick/${item.matchId}` : `/live/${item.matchId}`)}
      style={{
        backgroundColor: theme.surface,
        borderWidth: 1.5,
        borderColor: theme.line,
        borderLeftWidth: 4,
        borderLeftColor: isQuick ? theme.auction : theme.brand,
        borderRadius: 6,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{
          backgroundColor: isQuick ? theme.auction : theme.brand,
          borderRadius: 3,
          paddingHorizontal: 7,
          paddingVertical: 4,
        }}>
          <Text style={{
            fontFamily: 'SpaceMono_700Bold',
            fontSize: 9,
            letterSpacing: 0.16 * 9,
            textTransform: 'uppercase',
            color: isQuick ? theme.onAuction : theme.onBrand,
          }}>
            {isQuick ? 'Quick' : 'Live'}
          </Text>
        </View>
        <Text style={LBL(theme)} numberOfLines={1}>{sub}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 9, gap: 12 }}>
        <Text
          style={{
            flex: 1,
            fontFamily: 'Anton_400Regular',
            textTransform: 'uppercase',
            fontSize: 18,
            lineHeight: 22,
            color: theme.text,
          }}
          numberOfLines={2}
        >
          {heading}
        </Text>
        {item.scoreline ? (
          <Text style={{
            fontFamily: 'SpaceMono_700Bold',
            fontSize: 14,
            color: theme.text,
            fontVariant: ['tabular-nums'],
          }}>
            {item.scoreline}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
