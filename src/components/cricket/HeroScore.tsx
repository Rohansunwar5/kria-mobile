import { View, Text } from 'react-native';
import { CricketMatch, LiveState } from '@/api/cricketMatch';
import { oversDisplay, currentRunRate, requiredRunRate, chaseLine } from '@/lib/cricketView';
import { Tag } from '@/components/StatusPill';
import { Hairlines } from '@/components/canvas';
import { Ghost } from '@/components/states';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

export function HeroScore({ match, live, completed }: { match: CricketMatch; live: LiveState | null; completed: boolean }) {
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
  const rrr = requiredRunRate(live, maxOvers);
  const chase = chaseLine(live, maxOvers);

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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase', color: '#a3a3a3' }}>
          {team1} v {team2}
        </Text>
        {completed ? <Tag label="Full time" variant="open" /> : live ? <Tag label="Live" variant="live" dot /> : null}
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
            {rrr != null ? (
              <View>
                <Text style={LBL}>RRR</Text>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 17, color: '#FA4C93', marginTop: 3 }}>{rrr.toFixed(2)}</Text>
              </View>
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
