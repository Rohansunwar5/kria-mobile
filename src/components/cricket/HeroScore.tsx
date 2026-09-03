import { View, Text } from 'react-native';
import { CricketMatch, InningsScorecard, LiveState, TeamBrand } from '@/api/cricketMatch';
import { oversDisplay, currentRunRate, chaseLine } from '@/lib/cricketView';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hairlines } from '@/components/canvas';
import { Ghost } from '@/components/states';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

// The band used to repeat the fixture and the Live tag that the screen header
// already carries. It now names the side that is batting, which is the one
// thing the header cannot say.
export function HeroScore({
  match,
  live,
  innings,
  completed,
  brands = {},
}: {
  match: CricketMatch;
  live: LiveState | null;
  innings: InningsScorecard | null;
  completed: boolean;
  brands?: Record<string, TeamBrand>;
}) {
  const maxOvers = match.matchConfig?.maxOvers;
  const team1 = match.teams?.team1Name || 'Team 1';
  const team2 = match.teams?.team2Name || 'Team 2';
  const winnerName =
    String(match.winnerId) === String(match.teams?.team1Id)
      ? team1
      : String(match.winnerId) === String(match.teams?.team2Id)
        ? team2
        : null;

  const crr = currentRunRate(live);
  const chase = chaseLine(live, maxOvers);
  const battingName = innings?.battingTeamName;
  const bowlingName = innings?.bowlingTeamName;
  const brand = brands[String(innings?.battingTeamId ?? live?.battingTeamId ?? '')];

  return (
    <View
      style={{
        backgroundColor: '#151515',
        borderWidth: 1.5,
        borderColor: live && !completed ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.14)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <Hairlines />
      {live ? <Ghost text={`I${live.currentInnings}`} size={120} style={{ right: -10, bottom: -20 }} /> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <InitialsAvatar name={battingName || team1} size={22} color={brand?.primaryColor || '#3f3f46'} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 14, lineHeight: 14, color: '#fff' }}>
            {battingName ? `${battingName} batting` : `${team1} v ${team2}`}
          </Text>
          {bowlingName ? (
            <Text numberOfLines={1} style={{ ...LBL, letterSpacing: 0.1 * 9, marginTop: 3 }}>
              {`v ${bowlingName}`}
            </Text>
          ) : null}
        </View>
        {live ? (
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.16 * 9, color: '#7d7d7d' }}>
            {`INN ${live.currentInnings}`}
          </Text>
        ) : null}
      </View>

      {live ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 46, lineHeight: 42, color: '#fff' }}>
              {live.runs}
              <Text style={{ color: '#F97316' }}>/</Text>
              <Text style={{ fontSize: 32 }}>{live.wickets}</Text>
            </Text>
            <View style={{ alignItems: 'flex-end', paddingBottom: 4 }}>
              <Text style={LBL}>Overs</Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 17, color: '#fff', marginTop: 3 }}>
                {oversDisplay(live)}
                {maxOvers ? <Text style={{ color: '#7d7d7d' }}>/{maxOvers}</Text> : null}
              </Text>
            </View>
          </View>

          {chase ? <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: '#F97316', marginTop: 10 }}>{chase}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 24, marginTop: 12 }}>
            <View>
              <Text style={LBL}>CRR</Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 17, color: '#fff', marginTop: 3 }}>{crr.toFixed(2)}</Text>
            </View>
            {innings ? (
              <>
                <View>
                  <Text style={LBL}>Extras</Text>
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 17, color: '#fff', marginTop: 3 }}>
                    {innings.totals.extras.total}
                  </Text>
                </View>
                <View>
                  <Text style={LBL}>Boundaries</Text>
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 17, color: '#fff', marginTop: 3 }}>
                    {innings.battingCard.reduce((s, b) => s + b.fours, 0)}
                    <Text style={{ fontSize: 12, color: '#7d7d7d' }}>x4 </Text>
                    {innings.battingCard.reduce((s, b) => s + b.sixes, 0)}
                    <Text style={{ fontSize: 12, color: '#7d7d7d' }}>x6</Text>
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, color: '#7d7d7d', textAlign: 'center', paddingVertical: 26 }}>
          Not started
        </Text>
      )}

      {completed ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#16C46A' }}>
          <Text numberOfLines={2} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, color: '#06240F' }}>
            {winnerName ? `${winnerName} won` : 'Match complete'}
            {match.result?.marginOfVictory ? ` · ${match.result.marginOfVictory}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
