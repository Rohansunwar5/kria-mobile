import { View, Text } from 'react-native';
import { Skeleton, EmptyState, ErrorBlock } from '@/components/states';
import type { CareerProfile, SportSummary } from '@/api/career';

const LBL = {
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: '#7d7d7d',
};

const HAIRLINE = 'rgba(255,255,255,0.12)';

/** The server sends a 0-1 fraction; the UI is the only place it becomes a percentage. */
function asPercent(winRate: number): string {
  return `${Math.round(winRate * 100)}%`;
}

function Figure({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={LBL}>{label}</Text>
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 18,
          color: accent ? '#F97316' : '#fff',
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function SportRow({ summary, last }: { summary: SportSummary; last?: boolean }) {
  return (
    <View
      style={{
        paddingVertical: 12,
        ...(last ? null : { borderBottomWidth: 1.5, borderBottomColor: HAIRLINE }),
      }}
    >
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 11,
          letterSpacing: 0.14 * 11,
          textTransform: 'uppercase',
          color: '#fff',
          marginBottom: 8,
        }}
      >
        {summary.sport}
      </Text>
      <View style={{ flexDirection: 'row' }}>
        <Figure label="Played" value={String(summary.played)} />
        {/* Played and decided are deliberately both shown: a no_result match
            counts as played but is excluded from the win rate, so collapsing
            them into one number would misreport both. */}
        <Figure label="Decided" value={String(summary.decided)} />
        <Figure label="W-L-T" value={`${summary.won}-${summary.lost}-${summary.tied}`} />
        <Figure label="Win" value={asPercent(summary.winRate)} accent />
      </View>
    </View>
  );
}

function BestSportBadge({ summary }: { summary: SportSummary }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: 1.5,
        borderColor: '#F97316',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginBottom: 14,
      }}
    >
      <Text style={{ ...LBL, color: '#F97316' }}>Best sport</Text>
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 11,
          letterSpacing: 0.1 * 11,
          textTransform: 'uppercase',
          color: '#fff',
          marginLeft: 8,
        }}
      >
        {summary.sport} · {asPercent(summary.winRate)}
      </Text>
    </View>
  );
}

/**
 * A player's cross-sport career record.
 *
 * Rendered on both the player's own profile and any other player's, so it
 * takes its data as props and owns its loading/error/empty states rather than
 * fetching — the two host screens load differently (Redux vs local state) and
 * this component should not care which.
 */
export function CareerCard({
  profile,
  loading,
  error,
  onRetry,
}: {
  profile: CareerProfile | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const body = () => {
    if (error) {
      return (
        <ErrorBlock
          label="Career"
          title="Couldn’t load career stats"
          message="Pull to refresh, or try again in a moment."
          onRetry={onRetry}
        />
      );
    }

    if (loading || !profile) {
      return (
        <View>
          <Skeleton h={18} w="45%" style={{ marginBottom: 12 }} />
          <Skeleton h={52} line />
          <Skeleton h={52} line style={{ marginTop: 10 }} />
        </View>
      );
    }

    if (profile.sports.length === 0) {
      return (
        <EmptyState
          title="No matches yet"
          message="Play a tournament or host a quick match and your record starts here."
          icon="document"
        />
      );
    }

    return (
      <View>
        {/* Shown only when the server named a best sport. The >=10-decided
            eligibility rule lives on the server alone — re-implementing it
            here would give the rule two homes and let them drift. */}
        {profile.bestSport ? <BestSportBadge summary={profile.bestSport} /> : null}
        {profile.sports.map((s, i) => (
          <SportRow key={s.sport} summary={s} last={i === profile.sports.length - 1} />
        ))}
      </View>
    );
  };

  return (
    <View style={{ marginTop: 22 }}>
      {/* "by sport" is load-bearing: the own-profile screen already carries an
          unlabelled strip of aggregate tournament stats directly above this,
          and two things both called "Career" would read as the same figure. */}
      <Text style={{ ...LBL, letterSpacing: 0.18 * 9, marginBottom: 10 }}>Career by sport</Text>
      {body()}
    </View>
  );
}
