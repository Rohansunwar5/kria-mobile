import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { TournamentHistoryEntry } from '@/store/slices/registrationSlice';
import { StatusPill } from '@/components/StatusPill';
import { Lbl } from '@/components/canvas';
import { Icon } from '@/components/icons';
import { SPORT_ICON } from '@/lib/sports';

// TournamentHistory.dc.html. The artboard shows a finishing position (2nd, QF,
// Group); the history endpoint carries no placement, so the tag is the
// tournament's status and the footer holds what the API does return.

function money(n?: number) {
  if (!n) return '—';
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
      <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: tone || '#fff', marginTop: 3 }}>
        {value}
      </Text>
    </View>
  );
}

export function HistoryCard({ entry }: { entry: TournamentHistoryEntry }) {
  const router = useRouter();
  const t = entry.tournament;
  const sold = entry.auctionData?.soldPrice;
  const played = entry.stats?.matchesPlayed ?? 0;
  const won = entry.stats?.matchesWon ?? 0;
  const month = t?.startDate ? new Date(t.startDate).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : '';
  const sub = [entry.category?.name, month].filter(Boolean).join(' · ').toUpperCase();
  const highlight = won > 0 && won === played && played > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t?.name || 'Tournament'}
      disabled={!t?._id}
      onPress={() => t?._id && router.push(`/tournament/${t._id}`)}
      style={{
        backgroundColor: '#151515',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.14)',
        borderRadius: 6,
        overflow: 'hidden',
        ...(highlight ? { borderLeftWidth: 4, borderLeftColor: '#F97316' } : null),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11 }}>
        <Icon name={SPORT_ICON[t?.sport || ''] || 'trophy'} size={20} color={highlight ? '#F97316' : '#7d7d7d'} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: highlight ? '#fff' : '#d4d4d4' }}>
            {t?.name || 'Tournament'}
          </Text>
          {sub ? (
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, color: '#a3a3a3', marginTop: 5 }}>
              {sub}
            </Text>
          ) : null}
        </View>
        {t?.status ? <StatusPill status={t.status} /> : null}
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)' }}>
        <Cell label="Team" value={(entry.team?.name || 'Unsold').toUpperCase()} />
        <Cell label="Record" value={`${won}-${Math.max(played - won, 0)}`} />
        <Cell label="Sold for" value={money(sold)} tone={sold ? '#16C46A' : '#7d7d7d'} last />
      </View>
    </Pressable>
  );
}
