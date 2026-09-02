import { View, Text, Pressable } from 'react-native';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { Icon } from '@/components/icons';
import { Hairlines } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { formatShortDate } from '@/lib/format';

function initials(name: string) {
  return name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// The featured block from Main.dc.html: hairline texture, ghost monogram,
// Anton title, a three-cell data strip, and a solid orange CTA bar.
export function FeaturedTournament({ tournament, onPress }: { tournament: Tournament; onPress: () => void }) {
  const live = tournament.status === 'ongoing';
  const cells = [
    { label: 'Players', value: String(tournament.registeredPlayersCount ?? 0), big: true },
    { label: 'Teams', value: `${tournament.teamsCount ?? 0}/${tournament.settings?.maxTeams || '∞'}`, big: true },
    {
      label: 'Dates',
      value: `${formatShortDate(tournament.startDate)}–${formatShortDate(tournament.endDate)}`,
      big: false,
    },
  ];

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#151515',
        borderWidth: 1.5,
        borderColor: live ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.14)',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <Hairlines />
      <Ghost text={initials(tournament.name)} size={96} style={{ right: -8, bottom: -16 }} />

      <View style={{ paddingHorizontal: 16, paddingTop: 15 }}>
        <Text
          numberOfLines={2}
          style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 34, lineHeight: 31, color: '#fff' }}
        >
          {tournament.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.06 * 10, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 10 }}
        >
          {[tournament.venue?.name, tournament.venue?.city].filter(Boolean).join(' · ') || 'Venue TBD'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 14, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)' }}>
        {cells.map((c, i) => (
          <View
            key={c.label}
            style={{
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 9,
              ...(i < cells.length - 1 ? { borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.10)' } : null),
            }}
          >
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.12 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
              {c.label}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontFamily: 'SpaceMono_700Bold', fontSize: c.big ? 17 : 13, color: '#fff', marginTop: c.big ? 2 : 4 }}
            >
              {c.value}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#F97316',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, color: '#0B0B0B' }}>
          {live ? 'Watch the broadcast' : 'View tournament'}
        </Text>
        <Icon name="arrow-right" size={19} color="#0B0B0B" strokeWidth={2.6} />
      </View>
    </Pressable>
  );
}
