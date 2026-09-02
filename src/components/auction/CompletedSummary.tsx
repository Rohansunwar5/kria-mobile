import { View, Text, ScrollView } from 'react-native';
import { AuctionTeam } from '@/api/auction';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hazard, Kick, Lbl } from '@/components/canvas';
import { Ghost } from '@/components/states';

interface Props {
  tournamentName: string;
  categoryName: string;
  teams: AuctionTeam[];
}

function money(n: number) {
  return n >= 1000 ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `₹${n}`;
}

function Cell({ label, value, tone, last }: { label: string; value: string; tone?: string; last?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 13,
        paddingVertical: 9,
        ...(last ? null : { borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.10)' }),
      }}
    >
      <Lbl style={{ letterSpacing: 0.1 * 9 }}>{label}</Lbl>
      <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: tone || '#fff', marginTop: 3 }}>
        {value}
      </Text>
    </View>
  );
}

export function CompletedSummary({ tournamentName, categoryName, teams }: Props) {
  const spent = teams.reduce((s, t) => s + t.totalSpent, 0);
  const sorted = [...teams].sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 32 }}>
      <Ghost text="Done" size={170} style={{ right: -36, top: 90 }} />

      <Kick style={{ letterSpacing: 0.3 * 9 }}>Final results</Kick>
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 34, lineHeight: 30, color: '#fff', marginTop: 10 }}>
        Auction{'\n'}complete
      </Text>
      <Lbl style={{ marginTop: 9, letterSpacing: 0.1 * 9 }}>{`${tournamentName} · ${categoryName}`}</Lbl>

      <View style={{ height: 5, marginTop: 16, marginBottom: 16, overflow: 'hidden' }}>
        <Hazard />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 24, color: '#F97316' }}>{money(spent)}</Text>
        <Lbl style={{ letterSpacing: 0.14 * 9 }}>Total spent across {teams.length} teams</Lbl>
      </View>

      <View style={{ gap: 10 }}>
        {sorted.map((team) => (
          <View
            key={team._id}
            style={{
              backgroundColor: '#151515',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.14)',
              borderLeftWidth: 4,
              borderLeftColor: team.primaryColor || '#F97316',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 11 }}>
              <InitialsAvatar name={team.name} size={28} color={team.primaryColor || '#F97316'} />
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>
                {team.name}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)' }}>
              <Cell label="Spent" value={money(team.totalSpent)} tone="#F97316" />
              <Cell label="Left" value={money(team.budget)} tone="#16C46A" />
              <Cell label="Players" value={String(team.playersCount)} last />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
