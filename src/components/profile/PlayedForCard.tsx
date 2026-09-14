import { View, Text, Pressable } from 'react-native';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Tag } from '@/components/StatusPill';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { SPORT_LABELS } from '@/lib/sports';
import { formatMoney } from '@/lib/format';

// Played-for card, body-Profile.html: a 38px square team swatch, the team
// name over TOURNAMENT · YEAR, a sport tag, then a Played/Won(/Sold for)
// stat strip. `soldPrice` is a separate prop rather than something read off
// `entry`: a caller with that figure (the player's own authenticated
// history) passes it, the public profile screen has none to pass, and the
// cell's absence there follows from correct data flow instead of an
// always-undefined field on the public type.

// This card is fed by two different history shapes: `PublicHistoryEntry`
// (@/api/profileApi, from the public player profile — an explicit
// whitelist that never includes auction financials) and
// `TournamentHistoryEntry` (@/store/slices/registrationSlice, the
// authenticated player's own history). Neither type is imported here on
// purpose — `entry`'s type must depend only on the fields both shapes
// genuinely provide, not on whichever one happens to be passed, so this
// contract is stated narrowly rather than borrowed from one caller and
// held together with the other by structural luck.
export interface PlayedForEntry {
  createdAt: string;
  stats?: { matchesPlayed?: number; matchesWon?: number };
  tournament?: { _id: string; name: string; sport?: string };
  team?: { name: string; primaryColor?: string } | null;
}

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.12 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

function StatCell({ label, value, theme, tone }: { label: string; value: string; theme: Palette; tone?: string }) {
  return (
    <View style={{ flex: 1, paddingTop: 8 }}>
      <Text style={LBL(theme)}>{label}</Text>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 14, color: tone || theme.text, marginTop: 3 }}>
        {value}
      </Text>
    </View>
  );
}

export function PlayedForCard({
  entry,
  soldPrice,
  onPress,
}: {
  entry: PlayedForEntry;
  /** Auction sale price, when the caller's data source carries one. Absent on the public profile. */
  soldPrice?: number;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const tournament = entry.tournament;
  const team = entry.team;
  const pressable = Boolean(tournament?._id);

  const played = entry.stats?.matchesPlayed ?? 0;
  const won = entry.stats?.matchesWon ?? 0;

  const year = entry.createdAt ? new Date(entry.createdAt).getFullYear() : undefined;
  const sub = [tournament?.name || 'Tournament', year].filter(Boolean).join(' · ').toUpperCase();
  const sportLabel = tournament?.sport ? SPORT_LABELS[tournament.sport] ?? tournament.sport : undefined;

  return (
    <Pressable
      accessibilityRole={pressable ? 'button' : undefined}
      accessibilityLabel={team?.name || tournament?.name || 'Tournament'}
      accessibilityState={{ disabled: !pressable }}
      disabled={!pressable}
      onPress={() => {
        if (pressable) onPress?.();
      }}
      style={{
        minHeight: 44,
        paddingHorizontal: 13,
        paddingVertical: 11,
        backgroundColor: theme.surface,
        borderWidth: 1.5,
        borderColor: theme.line,
        borderRadius: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        {/* A missing primaryColor falls back to the brand token — an
            undefined colour string renders unpredictably in RN. */}
        <InitialsAvatar name={team?.name} size={38} color={team?.primaryColor || theme.brand} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 21, color: theme.text }}
          >
            {team?.name || 'Unassigned'}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.06 * 10, color: theme.textMeta, marginTop: 4 }}
          >
            {sub}
          </Text>
        </View>
        {sportLabel ? <Tag label={sportLabel} variant="up" /> : null}
      </View>

      <View style={{ flexDirection: 'row', marginTop: 11, borderTopWidth: 1.5, borderTopColor: theme.lineFaint }}>
        <StatCell label="Played" value={String(played)} theme={theme} />
        <StatCell label="Won" value={String(won)} theme={theme} />
        {/* soldPrice is tournament-only (Auction) — a badminton entry or a
            quick-play row has none, and an empty "Sold for —" cell would be
            noise rather than information, so the cell itself is omitted. */}
        {soldPrice ? <StatCell label="Sold for" value={formatMoney(soldPrice)} theme={theme} tone={theme.open} /> : null}
      </View>
    </Pressable>
  );
}
