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

/** A quick match opens its own screen; a tournament match opens the live scoreboard. */
const openItem = (item: LiveItem) =>
  router.push(item.kind === 'quick' ? `/quick/${item.matchId}` : `/live/${item.matchId}`);

/** The word for the kind, so the edge colour is never the only signal (DESIGN.md §7). */
function KindTag({ isQuick }: { isQuick: boolean }) {
  const theme = useTheme();
  return (
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
  );
}

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
      onPress={() => openItem(item)}
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
        <KindTag isQuick={isQuick} />
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

/**
 * Home's ticker version of the row: one line for where, one for who and the
 * score, about 70px tall. It leads with the players where the row leads with
 * the tournament, because a ticker is read for the match.
 */
export function LiveChip({ item }: { item: LiveItem }) {
  const theme = useTheme();
  const isQuick = item.kind === 'quick';
  const name = item.title ?? (item.kind === 'tournament' ? item.tournamentName : undefined) ?? item.sport;
  // When the title is missing the tournament name has already become the
  // name, so the line above falls back to the category instead of repeating it.
  const sub = item.kind === 'tournament'
    ? [item.title ? item.tournamentName : item.categoryName, item.round?.replace(/_/g, ' ')].filter(Boolean).join(' · ') || item.sport
    : item.sport;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, live`}
      onPress={() => openItem(item)}
      style={{
        width: 260,
        backgroundColor: theme.surface,
        borderWidth: 1.5,
        borderColor: theme.line,
        borderLeftWidth: 3,
        borderLeftColor: isQuick ? theme.auction : theme.brand,
        borderRadius: 6,
        paddingHorizontal: 11,
        paddingTop: 9,
        paddingBottom: 10,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <KindTag isQuick={isQuick} />
        <Text style={{ ...LBL(theme), flexShrink: 1 }} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: 'Anton_400Regular',
            textTransform: 'uppercase',
            fontSize: 16,
            lineHeight: 20,
            color: theme.text,
          }}
        >
          {name}
        </Text>
        {item.scoreline ? (
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: theme.text, fontVariant: ['tabular-nums'] }}>
            {item.scoreline}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
