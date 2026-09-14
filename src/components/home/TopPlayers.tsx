import { View, Text, Pressable } from 'react-native';
import { Icon } from '@/components/icons';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Tag } from '@/components/StatusPill';
import { Skeleton, ErrorBlock } from '@/components/states';
import { colors, useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { SPORTS } from '@/lib/tournamentConstants';
import { SPORT_LABELS } from '@/lib/sports';
import { useTopPlayers } from '@/lib/useTopPlayers';
import type { RankedPlayer } from '@/api/rankings';

// body-PlayFull.html's Top players block.
//
// `SPORTS[0]` is the list screen's 'All' sentinel — a ranking has no
// "all sports" meaning, since win rates across different sports are not
// comparable, so it is never one of the values the chip can land on.
//
// `RANKED_SPORTS[0]` (today 'badminton') is the source of truth for
// PlayPortal's initial sport — PlayPortal hardcodes that same literal in
// its own `useState` rather than importing this module just for a default,
// so the two will silently desync if `SPORTS` is ever reordered.
const RANKED_SPORTS = SPORTS.slice(1);

function sportLabel(sport: string): string {
  return SPORT_LABELS[sport] ?? sport;
}

/** Cycles to the next sport this app ranks, wrapping around. Falls back to
 *  the first ranked sport if `current` is somehow not one of them. */
function nextSport(current: string): string {
  const i = RANKED_SPORTS.indexOf(current);
  return RANKED_SPORTS[(i + 1) % RANKED_SPORTS.length] ?? RANKED_SPORTS[0];
}

/** The server sends a 0-1 fraction and owns the number — never recomputed
 *  from won/decided here. */
function winPercent(winRate: number): string {
  if (!Number.isFinite(winRate)) return '0%';
  return `${Math.round(winRate * 100)}%`;
}

function rowLabel(rank: number, player: RankedPlayer, isViewer: boolean): string {
  const name = `${player.firstName} ${player.lastName}`.trim();
  const you = isViewer ? ', you' : '';
  return `Rank ${rank}. ${name}${you}. ${player.decided} decided. ${winPercent(player.winRate)} win rate.`;
}

const HEADING = {
  fontFamily: 'Anton_400Regular' as const,
  fontSize: 20,
  lineHeight: 24,
  textTransform: 'uppercase' as const,
  color: colors.white,
};

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.14 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

function SportChip({ sport, onPress }: { sport: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Switch sport, currently ${sportLabel(sport)}`}
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 11,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: theme.keyline,
      }}
    >
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 11,
          letterSpacing: 0.08 * 11,
          textTransform: 'uppercase',
          color: theme.textBody,
        }}
      >
        {sportLabel(sport)}
      </Text>
      <Icon name="chevron-down" size={11} color={theme.textFaint} strokeWidth={2.2} />
    </Pressable>
  );
}

/**
 * One leaderboard row. Rank comes from array position (`rank`), never a
 * recomputed sort — the server already ranked the list. The viewer's own
 * row is marked three ways at once (border, rank colour, avatar colour) plus
 * a literal "You" tag, so the marker never depends on colour alone for a
 * screen reader or a colour-blind viewer.
 */
function PlayerRow({
  rank,
  player,
  isViewer,
  isFirst,
}: {
  rank: number;
  player: RankedPlayer;
  isViewer: boolean;
  isFirst: boolean;
}) {
  const theme = useTheme();
  const name = `${player.firstName} ${player.lastName}`.trim();
  return (
    <View
      accessible
      accessibilityLabel={rowLabel(rank, player, isViewer)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingHorizontal: 13,
        paddingVertical: 11,
        ...(isFirst ? null : { borderTopWidth: 1.5, borderTopColor: theme.lineFaint }),
        ...(isViewer ? { borderLeftWidth: 4, borderLeftColor: colors.auction } : null),
      }}
    >
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 12,
          width: 22,
          color: isViewer ? colors.auction : theme.textFaint,
        }}
      >
        {String(rank).padStart(2, '0')}
      </Text>
      <InitialsAvatar name={name} size={34} logo={player.profileImage} color={isViewer ? colors.auction : undefined} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: 'Anton_400Regular',
              textTransform: 'uppercase',
              fontSize: 16,
              lineHeight: 20,
              color: colors.white,
              flexShrink: 1,
            }}
          >
            {name}
          </Text>
          {isViewer ? <Tag label="You" variant="auction" /> : null}
        </View>
        <Text
          style={{
            fontFamily: 'SpaceMono_700Bold',
            fontSize: 10,
            letterSpacing: 0.1 * 10,
            textTransform: 'uppercase',
            color: theme.textFaint,
            marginTop: 4,
          }}
        >
          {`${player.decided} decided`}
        </Text>
      </View>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 16, color: colors.white }}>
        {winPercent(player.winRate)}
      </Text>
    </View>
  );
}

export interface TopPlayersProps {
  sport: string;
  onSportChange: (sport: string) => void;
  /** The signed-in player's id, so their own row can be marked. Absent for a
   *  logged-out render — no row is then anyone's own. */
  viewerId?: string;
}

/**
 * The Top players board: a sport chip, then rows of rank / square avatar /
 * name+decided / win rate, exactly as the server ranked and filtered them
 * (anyone under 10 decided matches is already excluded before this
 * component ever sees the list).
 *
 * Owns its own data via `useTopPlayers(sport)` — the caller only owns which
 * sport is selected, same split as `FilterSheet` owning its draft while the
 * screen owns the applied filters.
 */
export function TopPlayers({ sport, onSportChange, viewerId }: TopPlayersProps) {
  const theme = useTheme();
  const { players, loading, error, reload } = useTopPlayers(sport);

  const body = () => {
    if (loading && players.length === 0) {
      return (
        <View>
          <Skeleton h={56} />
          <Skeleton h={56} style={{ marginTop: 9 }} />
          <Skeleton h={56} style={{ marginTop: 9 }} />
        </View>
      );
    }

    if (error) {
      return (
        <ErrorBlock
          label="Top players"
          title="Couldn’t load top players"
          message="The rest of Play still works. Pull to refresh, or try again in a moment."
          onRetry={reload}
        />
      );
    }

    if (players.length === 0) {
      return (
        <View
          style={{
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: theme.keyline,
            borderRadius: 6,
            paddingHorizontal: 14,
            paddingVertical: 15,
          }}
        >
          <Text style={LBL(theme)}>Top players</Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: theme.textMeta, marginTop: 9 }}>
            {`The ${sportLabel(sport)} leaderboard appears here once ten players have decided matches.`}
          </Text>
        </View>
      );
    }

    return (
      <View style={{ borderWidth: 1.5, borderColor: theme.line, borderRadius: 6, backgroundColor: theme.surface, overflow: 'hidden' }}>
        {players.map((player, i) => (
          <PlayerRow
            key={player.playerId}
            rank={i + 1}
            player={player}
            isViewer={!!viewerId && player.playerId === viewerId}
            isFirst={i === 0}
          />
        ))}
      </View>
    );
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 9 }}>
        <Text style={HEADING}>Top players</Text>
        <SportChip sport={sport} onPress={() => onSportChange(nextSport(sport))} />
      </View>
      <View style={{ paddingHorizontal: 16 }}>{body()}</View>
    </View>
  );
}
