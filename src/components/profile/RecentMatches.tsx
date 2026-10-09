import { View, Text, Pressable } from 'react-native';
import { Icon } from '@/components/icons';
import { Skeleton, ErrorBlock } from '@/components/states';
import { FORM_TOKEN } from '@/components/profile/FormStrip';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { SPORT_LABELS } from '@/lib/sports';
import type { RecentMatch } from '@/api/career';

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

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

/** A no_result is NOT a loss — the server excludes it from the win rate, so
 *  it is never drawn or announced as one. */
const RESULT_WORD: Record<RecentMatch['result'], string> = {
  won: 'Won',
  lost: 'Lost',
  tied: 'Tied',
  no_result: 'No result',
};

/**
 * One result. The same row on home, on both profiles and on All matches, so
 * those screens can never disagree about how a result looks: a solid W/L
 * square (DESIGN.md §2 — status is a fill, never a tinted outline), the match,
 * its context, and the score in a capped column so a long cricket line wraps
 * onto a second line instead of squeezing the match name out.
 */
function Row({ match, first }: { match: RecentMatch; first: boolean }) {
  const theme = useTheme();
  const token = FORM_TOKEN(theme)[match.result];
  // The title names the sides; without one the sport is the only thing left to
  // call the match, and a blank line would read as a bug.
  const title = match.title ?? match.sport;
  // Naming the context matters: a quick match and a tournament match carry very
  // different weight, and the feed blends both.
  const context = match.knockout
    ? ['Knockout', match.knockout.name, match.knockout.round].filter(Boolean).join(' · ')
    : `${match.context} · ${SPORT_LABELS[match.sport] ?? match.sport}`;
  const date = shortDate(match.playedAt);

  return (
    <View
      accessible
      accessibilityLabel={[RESULT_WORD[match.result], title, match.scoreline, context, date].filter(Boolean).join('. ')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 13,
        paddingVertical: 11,
        ...(first ? null : { borderTopWidth: 1.5, borderTopColor: theme.lineFaint }),
      }}
    >
      <View style={{ width: 30, height: 30, borderRadius: 4, backgroundColor: token.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: token.token.length > 1 ? 10 : 13, color: token.fg }}>{token.token}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 18, color: theme.text }}>
          {title}
        </Text>
        <Text numberOfLines={1} style={{ ...LBL(theme), letterSpacing: 0.12 * 9, marginTop: 4 }}>
          {context}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', maxWidth: 150 }}>
        {match.scoreline ? (
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: theme.text, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
            {match.scoreline}
          </Text>
        ) : null}
        <Text style={{ ...LBL(theme), letterSpacing: 0.12 * 9, marginTop: 3 }}>{date}</Text>
      </View>
    </View>
  );
}

/**
 * A player's results, newest first, in one panel.
 *
 * Props-driven: it renders on home, on the player's own profile, on any other
 * player's, and on All matches, and those screens load their data differently.
 *
 * Renders NOTHING when the list is empty — every screen it sits on already
 * says, nearby, that nothing has been played yet.
 */
export function RecentMatches({
  matches,
  loading,
  error,
  onRetry,
  onSeeAll,
  limit = 5,
  heading = 'Recent matches',
  all,
}: {
  matches: RecentMatch[] | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Called by the All matches row, shown when more than `limit` matches were loaded. */
  onSeeAll?: () => void;
  /** How many rows to show before the All matches row takes over. */
  limit?: number;
  /** The label above the panel; null when the screen already titles the section. */
  heading?: string | null;
  /** Cap off: render every row, with no heading of its own (the All matches screen). */
  all?: boolean;
}) {
  const theme = useTheme();
  if (!error && !loading && matches && matches.length === 0) return null;

  const body = () => {
    if (error) {
      return (
        <ErrorBlock
          label="Recent"
          title="Couldn’t load recent matches"
          message={all ? 'Try again in a moment.' : 'Pull to refresh, or try again in a moment.'}
          onRetry={onRetry}
        />
      );
    }

    // Nothing cached yet: show the rows' geometry. Rows already on screen stay
    // up through a refresh rather than flashing back to a skeleton.
    if (!matches || (loading && matches.length === 0)) {
      return (
        <View>
          <Skeleton h={52} />
          <Skeleton h={52} style={{ marginTop: 8 }} />
          <Skeleton h={52} style={{ marginTop: 8 }} />
        </View>
      );
    }

    const shown = all ? matches : matches.slice(0, limit);
    return (
      <View style={{ borderWidth: 1.5, borderColor: theme.line, borderRadius: 6, backgroundColor: theme.surface, overflow: 'hidden' }}>
        {shown.map((m, i) => (
          <Row key={m._id} match={m} first={i === 0} />
        ))}
        {!all && onSeeAll && matches.length > limit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="All matches"
            onPress={onSeeAll}
            style={{
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 13,
              borderTopWidth: 1.5,
              borderTopColor: theme.lineFaint,
            }}
          >
            <Text style={{ ...LBL(theme), letterSpacing: 0.12 * 9, color: theme.brandInk }}>All matches</Text>
            <Icon name="arrow-right" size={12} color={theme.brandInk} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>
    );
  };

  const showHeading = !all && heading !== null;
  return (
    <View style={{ marginTop: showHeading || all ? 22 : 0 }}>
      {showHeading ? <Text style={{ ...LBL(theme), letterSpacing: 0.18 * 9, marginBottom: 10 }}>{heading}</Text> : null}
      {body()}
    </View>
  );
}
