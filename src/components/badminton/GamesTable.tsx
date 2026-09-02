import { View, Text } from 'react-native';
import type { BadmintonMatch } from '@/api/badmintonMatch';
import { currentGame } from '@/lib/badmintonLive';

const CELL = 34;
const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

function surname(name?: string) {
  if (!name) return 'TBD';
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

export function GamesTable({ match }: { match: BadmintonMatch }) {
  const games = match.gameScores || [];
  if (games.length === 0) return null;

  const live = currentGame(match);
  const id1 = match.competitorType === 'team' ? match.teams?.team1Id : match.player1?.registrationId;
  const names = [
    match.competitorType === 'team' ? match.teams?.team1Name : surname(match.player1?.name),
    match.competitorType === 'team' ? match.teams?.team2Name : surname(match.player2?.name),
  ];

  const cellColor = (g: (typeof games)[number], side: 1 | 2) => {
    if (!g.winnerId) return g.gameNumber === live?.gameNumber ? '#F97316' : '#7d7d7d';
    const wonBySideOne = String(g.winnerId) === String(id1);
    return (side === 1) === wonBySideOne ? '#16C46A' : '#7d7d7d';
  };

  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <Text style={{ ...LBL, flex: 1, letterSpacing: 0.12 * 9 }}>Player</Text>
        {games.map((g) => (
          <Text key={g.gameNumber} style={{ ...LBL, width: CELL, textAlign: 'center' }}>
            G{g.gameNumber}
          </Text>
        ))}
      </View>

      {([1, 2] as const).map((side) => (
        <View key={side}>
          <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: '#fff' }}>
              {names[side - 1] || 'TBD'}
            </Text>
            {games.map((g) => {
              const score = side === 1 ? g.team1Score : g.team2Score;
              const color = cellColor(g, side);
              return (
                <Text
                  key={g.gameNumber}
                  style={{
                    width: CELL,
                    textAlign: 'center',
                    fontFamily: color === '#7d7d7d' ? 'SpaceMono_400Regular' : 'SpaceMono_700Bold',
                    fontSize: 13,
                    color,
                  }}
                >
                  {score}
                </Text>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
