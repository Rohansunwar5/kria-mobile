import { View, Text } from 'react-native';
import type { TournamentHistoryEntry } from '@/store/slices/registrationSlice';
import { formatDate } from '@/lib/format';

export function HistoryCard({ entry }: { entry: TournamentHistoryEntry }) {
  const t = entry.tournament;
  const price = entry.auctionData?.soldPrice ?? entry.auctionData?.basePrice;
  const priceLabel = entry.auctionData?.soldPrice ? 'Auction Price' : 'Base Price';
  return (
    <View className="gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-oswald text-lg font-bold text-white" numberOfLines={1}>{t?.name || 'Tournament'}</Text>
        {!!t?.status && (
          <View className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
            <Text className="font-montserrat text-[10px] uppercase text-gray-300">{t.status}</Text>
          </View>
        )}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {!!entry.category?.name && <Text className="font-montserrat text-sm text-gray-400">📂 {entry.category.name}</Text>}
        {!!t?.venue?.city && <Text className="font-montserrat text-sm text-gray-400">📍 {t.venue.city}</Text>}
        {!!t?.startDate && <Text className="font-montserrat text-sm text-gray-400">🗓 {formatDate(t.startDate)}</Text>}
      </View>
      <View className="flex-row flex-wrap items-center gap-2">
        <View className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
          <Text className="font-montserrat text-[10px] uppercase text-gray-300">{entry.status}</Text>
        </View>
        {!!entry.team?.name && (
          <View className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
            <Text className="font-montserrat text-[10px] text-white">{entry.team.name}</Text>
          </View>
        )}
      </View>
      {price != null && price > 0 && (
        <View>
          <Text className="font-oswald text-[10px] uppercase tracking-wider text-gray-500">{priceLabel}</Text>
          <Text className="font-oswald text-xl font-bold text-brand">₹{price.toLocaleString()}</Text>
        </View>
      )}
    </View>
  );
}
