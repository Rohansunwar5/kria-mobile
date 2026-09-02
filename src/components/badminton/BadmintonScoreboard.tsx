import { View, Text } from 'react-native';
import type { BadmintonMatch } from '@/api/badmintonMatch';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hairlines } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { currentGame, gamesWon, matchLine } from '@/lib/badmintonLive';

function sideName(match: BadmintonMatch, side: 1 | 2) {
  if (match.competitorType === 'team') {
    return (side === 1 ? match.teams?.team1Name : match.teams?.team2Name) || 'TBD';
  }
  return (side === 1 ? match.player1?.name : match.player2?.name) || 'TBD';
}

function SideRow({
  match,
  side,
  serving,
}: {
  match: BadmintonMatch;
  side: 1 | 2;
  serving: 1 | 2 | null;
}) {
  const name = sideName(match, side);
  const game = currentGame(match);
  const live = side === 1 ? game?.team1Score ?? 0 : game?.team2Score ?? 0;
  const isServing = serving === side;

  // Earlier games, as a compact "21 · 14" run.
  const past = (match.gameScores || [])
    .filter((g) => g.gameNumber !== game?.gameNumber)
    .map((g) => (side === 1 ? g.team1Score : g.team2Score))
    .join(' · ');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        backgroundColor: isServing ? 'rgba(249,115,22,0.10)' : 'transparent',
        borderLeftWidth: 5,
        borderLeftColor: isServing ? '#F97316' : 'transparent',
      }}
    >
      <InitialsAvatar name={name} size={40} neutral={!isServing} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, lineHeight: 19, color: isServing ? '#fff' : '#d4d4d4' }}>
          {name}
        </Text>
        {serving === null ? null : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
            {isServing ? <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: '#F97316' }} /> : null}
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.12 * 9, textTransform: 'uppercase', color: isServing ? '#F97316' : '#7d7d7d' }}>
              {isServing ? 'Serving' : 'Receiving'}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        {past ? (
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 12, letterSpacing: 0.06 * 12, color: '#7d7d7d' }}>{past}</Text>
        ) : null}
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 48, lineHeight: 44, color: '#fff', minWidth: 56, textAlign: 'right' }}>
          {live}
        </Text>
      </View>
    </View>
  );
}

export function BadmintonScoreboard({ match, serving }: { match: BadmintonMatch; serving: 1 | 2 | null }) {
  const game = currentGame(match);
  const { one, two } = gamesWon(match);
  const cfg = match.matchConfig;

  return (
    <View style={{ overflow: 'hidden', borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Hairlines />
      {game ? <Ghost text={`G${game.gameNumber}`} size={130} style={{ right: -14, top: -10 }} /> : null}

      <SideRow match={match} side={1} serving={serving} />
      <SideRow match={match} side={2} serving={serving} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F97316', paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 14, color: '#0B0B0B' }}>
          {matchLine(match)}
        </Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.1 * 10, textTransform: 'uppercase', color: '#0B0B0B' }}>
          {cfg?.pointsToWin ? `To ${cfg.pointsToWin}` : ''}
          {cfg?.bestOf ? ` · Best of ${cfg.bestOf}` : ''}
          {one || two ? ` · ${one}-${two}` : ''}
        </Text>
      </View>
    </View>
  );
}
