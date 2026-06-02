import { View, Text } from 'react-native';
import { AuctionBid, AuctionTeam } from '@/api/auction';
import { latestFirst } from '@/lib/auctionView';

export function BidHistoryList({ bids, teams }: { bids: AuctionBid[]; teams: AuctionTeam[] }) {
  const rows = latestFirst(bids, 6);
  if (rows.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="font-oswald text-[11px] uppercase tracking-widest text-gray-500">Bid History</Text>
      {rows.map((bid, i) => {
        const team = teams.find((t) => t._id === bid.teamId);
        const latest = i === 0;
        return (
          <View
            key={`${bid.teamId}-${bid.timestamp}-${i}`}
            className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 ${
              latest ? 'border border-brand/30 bg-brand/10' : 'bg-white/5'
            }`}
          >
            <View className="flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: team?.primaryColor || '#64748b' }} />
              <Text className={`font-montserrat text-sm ${latest ? 'text-brand' : 'text-gray-300'}`} numberOfLines={1}>
                {bid.teamName}
              </Text>
            </View>
            <Text className={`font-oswald text-sm font-bold ${latest ? 'text-white' : 'text-gray-500'}`}>
              ₹{bid.amount.toLocaleString()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
