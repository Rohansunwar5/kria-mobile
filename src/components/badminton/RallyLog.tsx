import { View, Text } from 'react-native';
import type { BadmintonMatch } from '@/api/badmintonMatch';
import type { LoggedRally } from '@/lib/useBadmintonMatchSocket';
import { InitialsAvatar } from '@/components/InitialsAvatar';

function ago(at: number, now: number) {
  const s = Math.round((now - at) / 1000);
  if (s < 5) return 'NOW';
  if (s < 60) return `-${s}S`;
  const m = Math.round(s / 60);
  if (m < 60) return `-${m}M`;
  return `-${Math.round(m / 60)}H`;
}

function sideName(match: BadmintonMatch, side: 1 | 2) {
  if (match.competitorType === 'team') {
    return (side === 1 ? match.teams?.team1Name : match.teams?.team2Name) || 'TBD';
  }
  return (side === 1 ? match.player1?.name : match.player2?.name) || 'TBD';
}

/**
 * Point-by-point, built from score deltas received while this screen is open.
 * The server keeps no rally log, so this deliberately says "since you joined"
 * rather than pretending to be the full match history.
 */
export function RallyLog({ match, log, now }: { match: BadmintonMatch; log: LoggedRally[]; now: number }) {
  if (log.length === 0) return null;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
          Point by point
        </Text>
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
          Since you joined
        </Text>
      </View>

      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        {log.map((r, i) => {
          const newest = i === 0;
          const name = sideName(match, r.side);
          return (
            <View key={`${r.at}-${i}`}>
              {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} /> : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                  paddingHorizontal: 13,
                  paddingVertical: 9,
                  backgroundColor: newest ? 'rgba(249,115,22,0.08)' : 'transparent',
                }}
              >
                <Text style={{ width: 42, fontFamily: newest ? 'SpaceMono_700Bold' : 'SpaceMono_400Regular', fontSize: 11, color: newest ? '#F97316' : '#a3a3a3' }}>
                  {r.team1Score}-{r.team2Score}
                </Text>
                <InitialsAvatar name={name} size={22} neutral={r.side === 2} />
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: newest ? '#fff' : '#d4d4d4' }}>
                  Point to {name}
                </Text>
                <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: '#7d7d7d' }}>{ago(r.at, now)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
