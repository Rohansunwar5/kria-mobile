import { View, Text } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { winPercent } from '@/lib/format';
import { SPORT_LABELS } from '@/lib/sports';
import { FormStrip } from './FormStrip';
import type { SportSummary, RecentMatch } from '@/api/career';

const KICK = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.22 * 9,
  textTransform: 'uppercase' as const,
  color: theme.brand,
});

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.12 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const RECORD_LINE = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 11,
  letterSpacing: 0.08 * 11,
  color: theme.textBody,
  marginTop: 4,
});

/**
 * Glyphs the industrial icon set actually ships (`components/icons/index.tsx`)
 * — `shuttlecock` and `cricket-bat`. Every other sport falls back to `trophy`
 * rather than inventing a name that isn't in the set.
 */
const SPORT_ICON: Record<string, IconName> = {
  badminton: 'shuttlecock',
  cricket: 'cricket-bat',
};

/**
 * The best-sport hero for the player profile: the kicker, the big win-rate
 * figure, and the shared `FormStrip` (Task 1) underneath.
 *
 * `bestSport` is the one figure the server will not compute below 10 decided
 * matches (see `CareerProfile.bestSport`). Rendering nothing at all here —
 * rather than an empty shell — is deliberate: a blank hero would tell the
 * player they have no best sport, when the truth is there is not yet enough
 * evidence. That eligibility rule lives on the server alone; this component
 * only keys off whether the value is present, mirroring the reasoning
 * `CareerCard`'s `BestSportBadge` already applies to the same field.
 *
 * The big figure reads `bestSport.winRate` — a 0-1 fraction the server
 * owns — through `winPercent`. It is never recomputed from `won`/`decided`,
 * and the record line below it shows `won`/`lost`/`decided`, not `played`:
 * `decided` excludes no-result matches, which `played` does not.
 */
export function BestSportHero({
  bestSport,
  recent,
}: {
  bestSport: SportSummary | null;
  recent: RecentMatch[];
}) {
  const theme = useTheme();

  if (!bestSport) return null;

  const label = SPORT_LABELS[bestSport.sport] ?? bestSport.sport;
  const icon = SPORT_ICON[bestSport.sport] ?? 'trophy';

  return (
    <View
      style={{
        marginTop: 22,
        backgroundColor: theme.surface,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: theme.line,
        borderLeftWidth: 4,
        borderLeftColor: theme.brand,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12 }}>
        <Icon name={icon} size={15} color={theme.brand} strokeWidth={2} />
        <Text style={KICK(theme)}>Best sport · {label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 14, paddingTop: 8 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 52, lineHeight: 48, color: theme.text }}>
          {winPercent(bestSport.winRate, bestSport.decided)}
        </Text>
        <View style={{ paddingBottom: 7 }}>
          <Text style={LBL(theme)}>Win rate</Text>
          <Text style={RECORD_LINE(theme)}>
            {bestSport.won}W · {bestSport.lost}L · {bestSport.decided} DECIDED
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 11 }}>
        <FormStrip recent={recent} />
      </View>
    </View>
  );
}
