import { View, Text } from 'react-native';
import { Skeleton, EmptyState, ErrorBlock } from '@/components/states';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { winPercent } from '@/lib/format';
import type { CareerProfile, SportSummary } from '@/api/career';

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

// Column widths mirror the artboard's SPORT / PL / W / L / WIN% table
// (docs/design-canvas/home-portals/body-Profile.html).
const COL_PL = 42;
const COL_W = 36;
const COL_L = 36;
const COL_WIN = 46;

function HeaderCell({ label, width, theme, first }: { label: string; width?: number; theme: Palette; first?: boolean }) {
  return (
    <Text
      style={{
        ...LBL(theme),
        ...(width ? { width, textAlign: 'right' as const } : { flex: 1 }),
        ...(first ? { color: theme.textBody, letterSpacing: 0.14 * 9 } : null),
      }}
    >
      {label}
    </Text>
  );
}

function HeaderRow({ theme }: { theme: Palette }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 13, backgroundColor: theme.fillSoft }}>
      <HeaderCell label="Sport" theme={theme} first />
      <HeaderCell label="PL" width={COL_PL} theme={theme} />
      <HeaderCell label="W" width={COL_W} theme={theme} />
      <HeaderCell label="L" width={COL_L} theme={theme} />
      <HeaderCell label="WIN%" width={COL_WIN} theme={theme} />
    </View>
  );
}

function Divider({ theme }: { theme: Palette }) {
  return <View style={{ height: 1.5, backgroundColor: theme.lineSoft }} />;
}

/**
 * One line of the table: a sport's name plus its PL / W / L / WIN% figures.
 * `decided` is deliberately not its own column any more — the artboard's
 * table has no cell for it. The played-vs-decided distinction (a no_result
 * match is played but excluded from the win rate) now surfaces through PL
 * still counting it and the footnote below the table naming it, rather than
 * through a second number here.
 */
function SportTableRow({
  label,
  theme,
  played,
  won,
  lost,
  winRate,
  decided,
  emphasise,
  highlightWin,
}: {
  label: string;
  theme: Palette;
  played: number;
  won: number;
  lost: number;
  winRate: number;
  decided: number;
  emphasise?: boolean;
  /**
   * True only for the row whose sport is `profile.bestSport.sport`. This is
   * a reinforcement of the `BestSportBadge` above the table, not the only
   * signal for "this is the best sport" — the badge already names it in
   * text. Do not read the tint as the sole carrier and either strip it (it
   * is load-bearing alongside the badge) or duplicate a second highlight
   * elsewhere for the same fact.
   */
  highlightWin?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 13,
        ...(emphasise ? { backgroundColor: theme.brandTint } : null),
      }}
    >
      {/* Row title tier (DESIGN.md §1): Anton at 15px, matching the artboard
          (body-Profile.html renders "Badminton"/"Cricket"/"Total" all in
          `.ant` at 15px) — not Space Mono, which is for numerics only.
          lineHeight 18 clears the Anton floor (15 * 1.188 = 17.82). */}
      <Text
        style={{
          flex: 1,
          fontFamily: 'Anton_400Regular',
          fontSize: 15,
          lineHeight: 18,
          textTransform: 'uppercase',
          color: emphasise ? theme.brand : theme.text,
        }}
      >
        {label}
      </Text>
      <Text style={{ width: COL_PL, textAlign: 'right', fontFamily: 'SpaceMono_700Bold', fontSize: 14, color: theme.text }}>
        {played}
      </Text>
      <Text style={{ width: COL_W, textAlign: 'right', fontFamily: 'SpaceMono_700Bold', fontSize: 14, color: theme.text }}>
        {won}
      </Text>
      <Text style={{ width: COL_L, textAlign: 'right', fontFamily: 'SpaceMono_700Bold', fontSize: 14, color: theme.textFaint }}>
        {lost}
      </Text>
      <Text
        style={{
          width: COL_WIN,
          textAlign: 'right',
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 14,
          color: highlightWin ? theme.open : theme.text,
        }}
      >
        {winPercent(winRate, decided)}
      </Text>
    </View>
  );
}

/**
 * Sums played/won/lost/decided across every sport and derives the win rate
 * from SUMMED won over SUMMED decided — never by averaging the per-sport
 * `winRate` fractions. Averaging is wrong the moment two sports have
 * different volumes (90 decided at 90% and 10 decided at 10% average to a
 * meaningless 50%, when the real combined rate is 82%). There is no
 * server-sent total to defer to here, unlike a single sport's `winRate` —
 * this is the one place in the card where summing is the correct move.
 */
function totalsOf(sports: SportSummary[]) {
  return sports.reduce(
    (acc, s) => ({
      played: acc.played + s.played,
      won: acc.won + s.won,
      lost: acc.lost + s.lost,
      decided: acc.decided + s.decided,
      noResult: acc.noResult + s.noResult,
    }),
    { played: 0, won: 0, lost: 0, decided: 0, noResult: 0 }
  );
}

function BestSportBadge({ summary, theme }: { summary: SportSummary; theme: Palette }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: 1.5,
        borderColor: theme.brand,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginBottom: 14,
      }}
    >
      <Text style={{ ...LBL(theme), color: theme.brand }}>Best sport</Text>
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 11,
          letterSpacing: 0.1 * 11,
          textTransform: 'uppercase',
          color: theme.text,
          marginLeft: 8,
        }}
      >
        {summary.sport} · {winPercent(summary.winRate, summary.decided)}
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
  showBestSportBadge = true,
}: {
  profile: CareerProfile | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /**
   * Whether to render the inline "Best sport" badge above the table.
   * Defaults to `true` — on most hosts (e.g. the own-profile tab) this badge
   * is the ONLY place "best sport" is said, so it must stay on there. Pass
   * `false` only when the host already carries that same fact more
   * prominently elsewhere on screen: `player/[playerId].tsx` renders
   * `BestSportHero` directly above this card, and the badge would just be a
   * third restatement of a fact the hero already leads with.
   */
  showBestSportBadge?: boolean;
}) {
  const theme = useTheme();

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

    const totals = totalsOf(profile.sports);
    // A Total row that echoes a single sport's own numbers back adds nothing
    // — it only shows once there is more than one sport to sum.
    const showTotal = profile.sports.length > 1;
    const totalWinRate = totals.decided === 0 ? 0 : totals.won / totals.decided;

    return (
      <View>
        {/* Shown only when the server named a best sport AND the host wants
            it. The >=10-decided eligibility rule lives on the server alone —
            re-implementing it here would give the rule two homes and let
            them drift. */}
        {showBestSportBadge && profile.bestSport ? <BestSportBadge summary={profile.bestSport} theme={theme} /> : null}
        <View style={{ borderRadius: 5, borderWidth: 1.5, borderColor: theme.line, overflow: 'hidden' }}>
          <HeaderRow theme={theme} />
          {profile.sports.map((s) => (
            <View key={s.sport}>
              <Divider theme={theme} />
              <SportTableRow
                label={s.sport}
                theme={theme}
                played={s.played}
                won={s.won}
                lost={s.lost}
                winRate={s.winRate}
                decided={s.decided}
                // Keyed off which sport bestSport names, not off winRate —
                // the server already applied its 10-decided floor to decide
                // whether bestSport exists at all; re-deriving "best" from
                // the highest rate here would tint a 3-match 100% row that
                // floor exists to exclude.
                highlightWin={profile.bestSport?.sport === s.sport}
              />
            </View>
          ))}
          {showTotal ? (
            <View>
              <Divider theme={theme} />
              <SportTableRow
                label="Total"
                theme={theme}
                played={totals.played}
                won={totals.won}
                lost={totals.lost}
                winRate={totalWinRate}
                decided={totals.decided}
                emphasise
              />
            </View>
          ) : null}
        </View>
        {/* Only named when at least one no-result exists — played and decided
            already agree otherwise, and calling out zero of anything reads
            as noise. */}
        {totals.noResult > 0 ? (
          <Text
            style={{
              fontFamily: 'SpaceMono_700Bold',
              fontSize: 10,
              color: theme.textFaint,
              marginTop: 8,
              letterSpacing: 0.05 * 10,
              lineHeight: 15,
            }}
          >
            {totals.noResult} no-result{totals.noResult === 1 ? '' : 's'} excluded from win rate. Played counts it.
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ marginTop: 22 }}>
      {/* "by sport" is load-bearing: the own-profile screen already carries an
          unlabelled strip of aggregate tournament stats directly above this,
          and two things both called "Career" would read as the same figure. */}
      <Text style={{ ...LBL(theme), letterSpacing: 0.18 * 9, marginBottom: 10 }}>Career by sport</Text>
      {body()}
    </View>
  );
}
