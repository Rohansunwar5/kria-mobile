import { View, Text } from 'react-native';
import { AuctionStatus, AuctionTeam } from '@/api/auction';
import { Lbl } from '@/components/canvas';
import { Icon } from '@/components/icons';

export function TieBreakerPanel({ status, teams }: { status: AuctionStatus; teams: AuctionTeam[] }) {
  const tied = status.liveBid?.tiedTeams || [];
  if (tied.length < 2) return null;

  const winnerId = status.liveBid?.spinWinnerId;
  const winner = winnerId ? teams.find((t) => t._id === winnerId) : null;

  // Resolved goes green; unresolved uses the auction magenta, which is the
  // system's "something is happening to you right now" accent.
  const edge = winner ? '#16C46A' : '#FA4C93';

  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: edge, borderRadius: 6, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: edge }}>
        <Icon name={winner ? 'check' : 'flame'} size={11} color="#0B0B0B" strokeWidth={2.8} />
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.16 * 9, textTransform: 'uppercase', color: '#0B0B0B' }}>
          {winner ? 'Tie-breaker winner' : `Tie-breaker · ${tied.length} teams tied`}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 12, paddingVertical: 11 }}>
        {winner ? (
          <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, lineHeight: 19, color: '#fff' }}>
            {winner.name}
          </Text>
        ) : (
          <Lbl style={{ letterSpacing: 0.12 * 9 }}>Awaiting the organizer&apos;s spin</Lbl>
        )}
      </View>
    </View>
  );
}
