import { View, Text } from 'react-native';
import { Skeleton, ErrorBlock } from '@/components/states';
import type { RecentMatch } from '@/api/career';

const LBL = {
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: '#7d7d7d',
};

const HAIRLINE = 'rgba(255,255,255,0.12)';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * `1 Sep`, or `1 Sep 2025` once the match is from another year — without the
 * year, a feed spanning New Year shows two identical-looking rows twelve
 * months apart.
 *
 * Built by hand rather than through `toLocaleDateString`: Intl support varies
 * across JS engines, and this needs to render the same on every device.
 */
function shortDate(iso: string): string {
  const d = new Date(iso);
  const stamp = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? stamp : `${stamp} ${d.getFullYear()}`;
}

/**
 * A no_result is NOT a loss — the server excludes it from the win rate, so
 * rendering it as an L here would contradict the career card directly above.
 */
const RESULT: Record<RecentMatch['result'], { token: string; color: string }> = {
  won: { token: 'W', color: '#4ade80' },
  lost: { token: 'L', color: '#f87171' },
  tied: { token: 'T', color: '#fbbf24' },
  no_result: { token: 'NR', color: '#7d7d7d' },
};

function Row({ match, last }: { match: RecentMatch; last?: boolean }) {
  const { token, color } = RESULT[match.result];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        ...(last ? null : { borderBottomWidth: 1.5, borderBottomColor: HAIRLINE }),
      }}
    >
      <View
        style={{
          width: 34,
          height: 26,
          borderWidth: 1.5,
          borderColor: color,
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color }}>{token}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {/* The title names the sides; without one the sport is the only thing
            left to call the match, and a blank line would read as a bug. */}
        <Text
          style={{
            fontFamily: 'SpaceMono_700Bold',
            fontSize: 11,
            letterSpacing: 0.14 * 11,
            textTransform: 'uppercase',
            color: '#fff',
          }}
          numberOfLines={1}
        >
          {match.title ?? match.sport}
        </Text>
        {match.scoreline ? (
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: '#a0a0a0', marginTop: 3 }} numberOfLines={1}>
            {match.scoreline}
          </Text>
        ) : null}
        {/* Naming the context matters: a quick match and a tournament match
            carry very different weight, and the feed blends both. */}
        <Text style={{ ...LBL, marginTop: 3 }}>{match.context}</Text>
      </View>

      <Text style={{ ...LBL, color: '#a0a0a0' }}>{shortDate(match.playedAt)}</Text>
    </View>
  );
}

/**
 * A player's last few matches, newest first.
 *
 * Props-driven and state-owning for the same reason CareerCard is: it renders
 * on the player's own profile and on any other player's, and those two screens
 * load their data differently.
 *
 * Renders NOTHING when the list is empty. CareerCard sits directly above and
 * is empty whenever this is — a player with no participation rows has neither
 * — so an empty state here would only repeat the sentence already on screen.
 */
export function RecentMatches({
  matches,
  loading,
  error,
  onRetry,
}: {
  matches: RecentMatch[] | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  if (!error && !loading && matches && matches.length === 0) return null;

  const body = () => {
    if (error) {
      return (
        <ErrorBlock
          label="Recent"
          title="Couldn’t load recent matches"
          message="Pull to refresh, or try again in a moment."
          onRetry={onRetry}
        />
      );
    }

    if (loading || !matches) {
      return (
        <View>
          <Skeleton h={44} line />
          <Skeleton h={44} line style={{ marginTop: 8 }} />
          <Skeleton h={44} line style={{ marginTop: 8 }} />
        </View>
      );
    }

    return (
      <View>
        {matches.map((m, i) => (
          <Row key={m._id} match={m} last={i === matches.length - 1} />
        ))}
      </View>
    );
  };

  return (
    <View style={{ marginTop: 22 }}>
      <Text style={{ ...LBL, letterSpacing: 0.18 * 9, marginBottom: 10 }}>Recent matches</Text>
      {body()}
    </View>
  );
}
