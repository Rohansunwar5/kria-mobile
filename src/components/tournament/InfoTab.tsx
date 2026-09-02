import { View, Text } from 'react-native';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { formatDate } from '@/lib/format';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.12 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
        {label}
      </Text>
      <Text numberOfLines={2} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: '#fff', marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 20, color: '#fff', marginBottom: 10 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// Info absorbs the old Awards tab as its last section.
export function InfoTab({ tournament, awards }: { tournament: Tournament; awards: any[] }) {
  const rows: [string, string][][] = [
    [
      ['Starts', formatDate(tournament.startDate)],
      ['Ends', formatDate(tournament.endDate)],
    ],
    [
      ['Venue', tournament.venue?.name || tournament.venue?.city || 'TBD'],
      ['Entry closes', tournament.registrationDeadline ? formatDate(tournament.registrationDeadline) : 'TBD'],
    ],
  ];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 }}>
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        {rows.map((row, r) => (
          <View
            key={r}
            style={{
              flexDirection: 'row',
              ...(r > 0 ? { borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)' } : null),
            }}
          >
            {row.map(([label, value], i) => (
              <View
                key={label}
                style={{ flex: 1, flexDirection: 'row', ...(i === 0 ? { borderRightWidth: 1.5, borderRightColor: 'rgba(255,255,255,0.10)' } : null) }}
              >
                <Fact label={label} value={value} />
              </View>
            ))}
          </View>
        ))}
      </View>

      <Section title="About">
        <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: '#d4d4d4' }}>
          {tournament.description || 'The organiser has not written a description for this tournament yet.'}
        </Text>
      </Section>

      {awards.length > 0 ? (
        <Section title="Awards">
          <View style={{ gap: 7 }}>
            {awards.map((award, i) => {
              const recipient = award.player?.profile
                ? `${award.player.profile.firstName || ''} ${award.player.profile.lastName || ''}`.trim() || award.player.profile.name
                : award.team?.name || 'Unknown recipient';
              return (
                <View
                  key={award._id || i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 13,
                    backgroundColor: '#151515',
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.14)',
                    borderRadius: 6,
                  }}
                >
                  <InitialsAvatar name={recipient} size={38} color="#FA4C93" />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 15, color: '#fff' }}>
                      {award.title}
                    </Text>
                    <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#a3a3a3', marginTop: 4 }}>
                      {recipient}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Section>
      ) : null}
    </View>
  );
}
