import { View, Text, Pressable } from 'react-native';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { StatusPill, Tag } from './StatusPill';
import { Ghost } from './states';
import { formatShortDate } from '@/lib/format';

// The "Open for entry" block from Main.dc.html: flat panel, 4px brand edge,
// ghost index. No banner image — v2 leads with type, not photography.
export function TournamentCard({
  tournament,
  onPress,
  index,
  entryFee,
}: {
  tournament: Tournament;
  onPress: () => void;
  index?: number;
  entryFee?: number;
}) {
  const meta = [
    tournament.venue?.city,
    `${tournament.registeredPlayersCount ?? 0} players`,
    `${tournament.teamsCount ?? 0}/${tournament.settings?.maxTeams || '∞'} teams`,
    `${formatShortDate(tournament.startDate)}–${formatShortDate(tournament.endDate)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={{
        marginBottom: 12,
        backgroundColor: '#151515',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.14)',
        borderLeftWidth: 4,
        borderLeftColor: '#F97316',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {index != null ? <Ghost text={String(index).padStart(2, '0')} size={72} style={{ right: 4, top: -6 }} /> : null}

      <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <StatusPill status={tournament.status} />
          {tournament.sport ? <Tag label={tournament.sport.replace('_', ' ')} /> : null}
        </View>
        <Text
          numberOfLines={2}
          style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 23, lineHeight: 21, color: '#fff' }}
        >
          {tournament.name}
        </Text>
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.06 * 10, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 8 }}>
          {meta}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 11,
          marginTop: 12,
          borderTopWidth: 1.5,
          borderTopColor: 'rgba(255,255,255,0.10)',
        }}
      >
        {entryFee != null ? (
          <View>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.12 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
              Entry
            </Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 16, color: '#16C46A', marginTop: 2 }}>
              ₹{entryFee.toLocaleString('en-IN')}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Tag label={tournament.status === 'registration_open' ? 'Enter now' : 'View'} variant="auction" />
      </View>
    </Pressable>
  );
}
