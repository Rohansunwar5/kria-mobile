import { View, Text } from 'react-native';
import { StandingEntry } from '@/api/teamLeague';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hazard } from '@/components/canvas';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

// The artboard drops a hazard rule under the qualifying places, so where the
// cut falls is readable without counting rows.
export function StandingsTable({
  title,
  subtitle,
  entries,
  championTeamId,
  qualifyCount,
  myTeamId,
}: {
  title: string;
  subtitle?: string;
  entries: StandingEntry[];
  championTeamId?: string;
  /** Teams above this line advance. Omitted when the format has no cut. */
  qualifyCount?: number;
  myTeamId?: string;
}) {
  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <Text numberOfLines={1} style={{ ...LBL, flex: 1, letterSpacing: 0.12 * 9, color: '#d4d4d4' }}>{title}</Text>
        {subtitle ? <Text style={LBL}>{subtitle}</Text> : null}
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8 }}>
        <Text style={{ ...LBL, width: 20 }}>#</Text>
        <Text style={{ ...LBL, flex: 1, letterSpacing: 0.12 * 9 }}>Team</Text>
        <Text style={{ ...LBL, width: 24, textAlign: 'right' }}>P</Text>
        <Text style={{ ...LBL, width: 24, textAlign: 'right' }}>W</Text>
        <Text style={{ ...LBL, width: 46, textAlign: 'right' }}>Rub</Text>
        <Text style={{ ...LBL, width: 30, textAlign: 'right' }}>Pts</Text>
      </View>

      {entries.map((e, idx) => {
        const first = idx === 0;
        const mine = myTeamId === e.teamId;
        const below = qualifyCount != null && idx >= qualifyCount;
        const cutHere = qualifyCount != null && idx === qualifyCount && idx > 0;

        return (
          <View key={e.teamId}>
            {cutHere ? <Hazard height={3} /> : <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 10,
                opacity: below ? 0.6 : 1,
                backgroundColor: first ? 'rgba(249,115,22,0.10)' : mine ? 'rgba(250,76,147,0.08)' : 'transparent',
                ...(first ? { borderLeftWidth: 4, borderLeftColor: '#F97316' } : null),
              }}
            >
              <Text style={{ width: first ? 16 : 20, fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: first ? '#F97316' : '#a3a3a3' }}>
                {idx + 1}
              </Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <InitialsAvatar name={e.teamName} size={22} neutral={!first} />
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 14, color: first ? '#fff' : '#d4d4d4' }}>
                  {e.teamName}
                </Text>
                {championTeamId === e.teamId ? (
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, color: '#16C46A' }}>WON</Text>
                ) : null}
              </View>
              <Text style={{ width: 24, textAlign: 'right', fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#d4d4d4' }}>{e.played}</Text>
              <Text style={{ width: 24, textAlign: 'right', fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#d4d4d4' }}>{e.won}</Text>
              <Text style={{ width: 46, textAlign: 'right', fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: '#a3a3a3' }}>
                {e.subMatchesWon}-{e.subMatchesLost}
              </Text>
              <Text style={{ width: 30, textAlign: 'right', fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: first ? '#F97316' : '#fff' }}>
                {e.points}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
