import { View, Text } from 'react-native';
import { Skeleton, ErrorBlock } from '@/components/states';
import { Icon, type IconName } from '@/components/icons';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import type { Achievement } from '@/api/career';

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const COLUMNS = 4;

/**
 * Glyph per achievement id. The four ids below are exactly what
 * `deriveAchievements` (server `careerStats.service.ts`) emits today:
 * `matches-50`, `matches-100`, `wins-25`, `sports-2`. A future id this build
 * has never seen falls back to `medal` rather than crashing — the list is
 * server-driven, and a generic badge beats a broken screen.
 *
 * `sports-2` ("play 2 different sports") has no dedicated multi-sport glyph
 * in the icon set (`src/components/icons/index.tsx`) — every sport glyph
 * there (`shuttlecock`, `cricket-bat`, `stumps`, `ball`, `court`) draws ONE
 * sport, and drawing two of them into one 24x24 badge reads as clutter, not
 * "two sports". `chart` (a multi-bar graph) stands in for "spread across
 * categories" instead — the closest approximation available, not a literal
 * match. Called out here and in the task report rather than forcing a wrong
 * sport-specific icon.
 */
const GLYPH: Partial<Record<Achievement['id'], IconName>> = {
  'matches-50': 'medal',
  'matches-100': 'flame',
  'wins-25': 'trophy',
  'sports-2': 'chart',
};
const FALLBACK_GLYPH: IconName = 'medal';

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/**
 * The unearned achievement whose progress fraction is highest — the one
 * closest to unlocking. Deliberately not "the first unearned in the array":
 * the server's fixed order (`matches-50`, `matches-100`, `wins-25`,
 * `sports-2`) is not sorted by proximity to completion, so array position
 * alone would sometimes point at a badge nowhere close while a further-down
 * one sits at 90%.
 */
function nearestUnearned(achievements: Achievement[]): Achievement | null {
  return achievements.filter((a) => !a.earned).reduce<Achievement | null>((best, a) => {
    if (!best) return a;
    return a.progress / a.target > best.progress / best.target ? a : best;
  }, null);
}

function Badge({ achievement, theme }: { achievement: Achievement; theme: Palette }) {
  const { id, label, earned } = achievement;
  const tint = earned ? theme.brand : theme.mutedTint;
  return (
    <View
      accessible
      // The difference is announced, not only drawn (DESIGN.md §7) — the
      // dimmed tile below is a reinforcement, not the only signal.
      accessibilityLabel={`${label} — ${earned ? 'earned' : 'locked'}`}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 7,
        paddingVertical: 11,
        paddingHorizontal: 4,
        borderRadius: 5,
        backgroundColor: theme.surfaceAlt,
        opacity: earned ? 1 : 0.4,
      }}
    >
      <Icon name={GLYPH[id] ?? FALLBACK_GLYPH} size={24} color={tint} />
      <Text
        numberOfLines={2}
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 8,
          letterSpacing: 0.08 * 8,
          textTransform: 'uppercase',
          textAlign: 'center',
          lineHeight: 11,
          color: earned ? theme.textBody : theme.textFaint,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function NextRow({ achievement, theme }: { achievement: Achievement; theme: Palette }) {
  const pct = `${(achievement.progress / achievement.target) * 100}%` as const;
  return (
    <View
      style={{
        marginTop: 9,
        padding: 12,
        borderRadius: 5,
        backgroundColor: theme.surface,
        borderWidth: 1.5,
        borderColor: theme.line,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ ...LBL(theme), flex: 1, letterSpacing: 0.12 * 9 }}>Next · {achievement.label}</Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: theme.text }}>
          {achievement.progress}/{achievement.target}
        </Text>
      </View>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.fillSoft, marginTop: 9, overflow: 'hidden' }}>
        <View style={{ width: pct, height: 5, backgroundColor: theme.brand }} />
      </View>
    </View>
  );
}

/**
 * The player's achievement badges: a fixed 4-wide grid, plus a progress row
 * for whichever locked badge is closest to unlocking.
 *
 * Props-driven and state-owning like `CareerCard`/`RecentMatches` beside it —
 * it renders on the player's own profile and on any other player's, and
 * those two screens load their data differently.
 *
 * Renders NOTHING once settled with an empty list. `CareerCard` sits
 * directly above and is already empty for a player with no career figures
 * at all — a second empty state here would say the same thing twice.
 */
export function Achievements({
  achievements,
  loading,
  error,
  onRetry,
}: {
  achievements: Achievement[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const theme = useTheme();

  if (!error && !loading && achievements.length === 0) return null;

  const body = () => {
    if (error) {
      return (
        <ErrorBlock
          label="Achievements"
          title="Couldn’t load achievements"
          message="Pull to refresh, or try again in a moment."
          onRetry={onRetry}
        />
      );
    }

    if (loading) {
      return (
        <View style={{ flexDirection: 'row', gap: 9 }}>
          {Array.from({ length: COLUMNS }, (_, i) => (
            <Skeleton key={i} h={78} style={{ flex: 1 }} />
          ))}
        </View>
      );
    }

    const next = nearestUnearned(achievements);

    return (
      <View>
        {chunk(achievements, COLUMNS).map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 9, marginTop: i === 0 ? 0 : 9 }}>
            {row.map((a) => (
              <Badge key={a.id} achievement={a} theme={theme} />
            ))}
            {Array.from({ length: COLUMNS - row.length }, (_, j) => (
              <View key={`filler-${j}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}
        {next ? <NextRow achievement={next} theme={theme} /> : null}
      </View>
    );
  };

  return (
    <View style={{ marginTop: 22 }}>
      <Text style={{ ...LBL(theme), letterSpacing: 0.18 * 9, marginBottom: 10 }}>Achievements</Text>
      {body()}
    </View>
  );
}
