import { View, Text } from 'react-native';
import { AuctionBid, AuctionTeam } from '@/api/auction';
import { latestFirst } from '@/lib/auctionView';
import { InitialsAvatar } from '@/components/InitialsAvatar';

// The artboard's "Bid ladder": newest bid highlighted, older ones receding.
export function BidHistoryList({ bids, teams }: { bids: AuctionBid[]; teams: AuctionTeam[] }) {
  const rows = latestFirst(bids, 6);
  if (rows.length === 0) return null;

  return (
    <View>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginBottom: 8 }}>
        Bid ladder
      </Text>
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        {rows.map((bid, i) => {
          const team = teams.find((t) => t._id === bid.teamId);
          const latest = i === 0;
          return (
            <View key={`${bid.teamId}-${bid.timestamp}-${i}`}>
              {i > 0 ? <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} /> : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 13,
                  paddingVertical: 9,
                  backgroundColor: latest ? 'rgba(249,115,22,0.10)' : 'transparent',
                }}
              >
                <InitialsAvatar name={team?.name || bid.teamName} size={22} color={team?.primaryColor || '#F97316'} />
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: latest ? '#fff' : '#d4d4d4' }}>
                  {team?.name || bid.teamName}
                </Text>
                <Text style={{ fontFamily: latest ? 'SpaceMono_700Bold' : 'SpaceMono_400Regular', fontSize: latest ? 13 : 12, color: latest ? '#F97316' : '#a3a3a3' }}>
                  ₹{bid.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
