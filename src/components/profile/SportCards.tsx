import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { Icon } from '@/components/icons';
import { Skeleton, ErrorBlock } from '@/components/states';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { winPercent } from '@/lib/format';
import { SPORT_ICON, SPORT_LABELS } from '@/lib/sports';
import type { CareerProfile, SportSummary } from '@/api/career';

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.12 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const NOTE = (theme: Palette) => ({
  fontFamily: 'SpaceGrotesk_400Regular' as const,
  fontSize: 12,
  lineHeight: 17,
  color: theme.textFaint,
  marginTop: 9,
});

/**
 * `1W · 3L · 1NR · 5 played`. Ties and no-results are named, never folded into
 * losses: the server counts them as played but leaves them out of the win
 * rate, so hiding them would let the two figures on a card disagree.
 */
export function recordLine(s: SportSummary): string {
  const parts = [`${s.won}W`, `${s.lost}L`];
  if (s.tied > 0) parts.push(`${s.tied}T`);
  if (s.noResult > 0) parts.push(`${s.noResult}NR`);
  parts.push(`${s.played} played`);
  return parts.join(' · ');
}

/** One sport. The bar is drawn to scale, so 25% and 67% look as different as
 *  they are. The win rate is the server's 0-1 fraction, never recomputed. */
function SportCard({ summary, best }: { summary: SportSummary; best: boolean }) {
  const theme = useTheme();
  const pct = winPercent(summary.winRate, summary.decided);
  const fill = summary.decided > 0 && Number.isFinite(summary.winRate) ? Math.max(0, Math.min(1, summary.winRate)) : 0;
  const width = `${fill * 100}%` as const;
  const label = SPORT_LABELS[summary.sport] ?? summary.sport;
  return (
    <View
      accessible
      accessibilityLabel={`${label}${best ? ', best sport' : ''}. ${pct} win rate. ${recordLine(summary)}.`}
      style={{
        flexGrow: 1,
        flexBasis: '46%',
        padding: 12,
        gap: 8,
        borderWidth: 1.5,
        borderColor: theme.line,
        borderRadius: 6,
        backgroundColor: theme.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Icon name={SPORT_ICON[summary.sport] ?? 'trophy'} size={15} color={theme.brandInk} />
        <Text numberOfLines={1} style={{ ...LBL(theme), flex: 1, color: theme.textBody }}>{label}</Text>
        {best ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="trophy" size={11} color={theme.auctionInk} />
            <Text style={{ ...LBL(theme), color: theme.auctionInk }}>Best</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 36, lineHeight: 40, letterSpacing: -0.5, color: theme.text }}>
        {pct.slice(0, -1)}
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 16, color: theme.textMeta }}>%</Text>
      </Text>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.fillSoft, overflow: 'hidden' }}>
        <View style={{ width, height: 5, backgroundColor: theme.brand }} />
      </View>
      <Text style={LBL(theme)}>{recordLine(summary)}</Text>
    </View>
  );
}

/**
 * A card per sport, on your profile and on any other player's.
 *
 * The best sport is marked only when the server names one — that rule (10
 * decided matches) lives on the server alone, and re-deriving it here would
 * give it two homes that drift.
 */
export function SportCards({
  profile,
  loading,
  error,
  onRetry,
  emptyAction,
}: {
  profile: CareerProfile | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** The one action that fills the empty state — Host, on your own profile. */
  emptyAction?: ReactNode;
}) {
  const theme = useTheme();
  const sports = profile?.sports ?? [];
  const best = profile?.bestSport?.sport;

  const body = () => {
    if (error) {
      return (
        <ErrorBlock label="By sport" title="Couldn’t load the record" message="Pull to refresh, or try again in a moment." onRetry={onRetry} />
      );
    }
    // Nothing cached yet: card geometry, never a blank (DESIGN.md §5).
    if (loading && !profile) return <Skeleton h={150} />;
    if (sports.length === 0) {
      return (
        <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.keyline, borderRadius: 6, padding: 14, gap: 12 }}>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: theme.textMeta }}>
            The record starts with the first match. Win rate and a card per sport appear here once one is played.
          </Text>
          {emptyAction}
        </View>
      );
    }
    return (
      <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {sports.map((s) => (
            <SportCard key={s.sport} summary={s} best={s.sport === best} />
          ))}
        </View>
        {sports.some((s) => s.noResult > 0) ? (
          <Text style={NOTE(theme)}>NR is a no-result: counted as played, left out of the win rate.</Text>
        ) : null}
        {best ? null : <Text style={NOTE(theme)}>A sport is marked Best once it has 10 decided matches.</Text>}
      </>
    );
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, lineHeight: 24, color: theme.text }}>By sport</Text>
        {sports.length > 0 ? (
          <Text style={{ ...LBL(theme), fontSize: 10, paddingBottom: 3 }}>{`${sports.length} ${sports.length === 1 ? 'sport' : 'sports'}`}</Text>
        ) : null}
      </View>
      {body()}
    </View>
  );
}
