import { View, Text } from 'react-native';
import { Standing } from '@/lib/bracketView';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

export function StandingsTable({ standings, competitorType }: { standings: Standing[]; competitorType: 'player' | 'team' }) {
  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <Text style={{ ...LBL, width: 22 }}>#</Text>
        <Text style={{ ...LBL, flex: 1, letterSpacing: 0.12 * 9 }}>{competitorType === 'player' ? 'Player' : 'Team'}</Text>
        <Text style={{ ...LBL, width: 28, textAlign: 'center' }}>P</Text>
        <Text style={{ ...LBL, width: 28, textAlign: 'center' }}>W</Text>
        <Text style={{ ...LBL, width: 28, textAlign: 'center' }}>L</Text>
        <Text style={{ ...LBL, width: 34, textAlign: 'center' }}>Pts</Text>
      </View>
      {standings.map((s, i) => (
        <View key={s.id || i}>
          <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ width: 22, fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: '#7d7d7d' }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: '#fff' }}>{s.name}</Text>
              {competitorType === 'player' && s.teamName ? (
                <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
                  {s.teamName}
                </Text>
              ) : null}
            </View>
            <Text style={{ width: 28, textAlign: 'center', fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#a3a3a3' }}>{s.played}</Text>
            <Text style={{ width: 28, textAlign: 'center', fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#16C46A' }}>{s.won}</Text>
            <Text style={{ width: 28, textAlign: 'center', fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#7d7d7d' }}>{s.lost}</Text>
            <Text style={{ width: 34, textAlign: 'center', fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#F97316' }}>{s.points}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
