import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LiveMatchSummary } from '@/api/cricketMatch';
import { Tag } from '@/components/StatusPill';
import { Lbl } from '@/components/canvas';
import { Icon } from '@/components/icons';

// The compact live row from CricketLive.dc.html's hero: brand edge, mono
// numerals, `.t-live` tag. Red is reserved for failures in this system, so
// "live" is orange here, not red.
export function LiveMatchCard({ match }: { match: LiveMatchSummary }) {
  const router = useRouter();
  const live = match.cricketLiveState;
  const t1 = match.teams?.team1Name || 'Team 1';
  const t2 = match.teams?.team2Name || 'Team 2';
  const runs = live?.runs ?? 0;
  const wkts = live?.wickets ?? 0;
  const overs = `${live?.completedOvers ?? 0}.${live?.ballsInCurrentOver ?? 0}`;
  const need = live?.target != null ? `NEED ${Math.max(0, live.target - runs)} OF ${live.target}` : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t1} versus ${t2}, live`}
      onPress={() => router.push({ pathname: '/live/[matchId]', params: { matchId: match._id } })}
      style={{
        backgroundColor: '#151515',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.14)',
        borderLeftWidth: 4,
        borderLeftColor: '#F97316',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingTop: 11 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 15, color: '#fff' }}>
          {t1} v {t2}
        </Text>
        <Tag label="Live" variant="live" dot />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, paddingHorizontal: 13, paddingTop: 8 }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 30, lineHeight: 30, color: '#fff' }}>{runs}</Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 17, color: '#F97316' }}>/{wkts}</Text>
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 12, color: '#a3a3a3' }}>{overs} ov</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 10, marginTop: 8, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)' }}>
        <Lbl style={{ flex: 1, letterSpacing: 0.1 * 9 }}>{need || 'Watch live'}</Lbl>
        <Icon name="arrow-right" size={14} color="#F97316" strokeWidth={2.6} />
      </View>
    </Pressable>
  );
}
