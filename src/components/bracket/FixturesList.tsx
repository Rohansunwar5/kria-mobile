import { View, Text } from 'react-native';
import { Match } from '@/api/match';
import { getCompetitors } from '@/lib/bracketView';

export function FixturesList({ matches, competitorType }: { matches: Match[]; competitorType: 'player' | 'team' }) {
  return (
    <View>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginBottom: 8 }}>
        All fixtures
      </Text>
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        {matches.map((m, i) => {
          const { c1, c2 } = getCompetitors(m, competitorType);
          const done = m.status === 'completed';
          const name = (c: typeof c1, align: 'right' | 'left') => (
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                textAlign: align,
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 13,
                color: m.winnerId === c.id ? '#16C46A' : '#fff',
              }}
            >
              {c.name}
            </Text>
          );
          return (
            <View key={m._id}>
              {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 }}>
                {name(c1, 'right')}
                <View style={{ paddingHorizontal: 12 }}>
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: done ? 12 : 9, letterSpacing: 0.1 * 9, color: done ? '#fff' : '#7d7d7d' }}>
                    {done ? `${c1.score ?? '-'} : ${c2.score ?? '-'}` : 'VS'}
                  </Text>
                </View>
                {name(c2, 'left')}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
