import { View, Text } from 'react-native';
import { AuctionSoldLog } from '@/api/auction';
import { latestFirst } from '@/lib/auctionView';

export function SoldLogList({ logs }: { logs: AuctionSoldLog[] }) {
  const rows = latestFirst(logs, 50);
  return (
    <View className="gap-2">
      <Text className="font-oswald text-[11px] uppercase tracking-widest text-gray-500">
        Sold Players <Text className="text-gray-600">({logs.length})</Text>
      </Text>
      {rows.length === 0 ? (
        <View className="items-center rounded-xl border border-white/10 bg-white/5 py-6">
          <Text className="font-oswald text-xs uppercase tracking-wider text-gray-600">No players sold yet</Text>
        </View>
      ) : (
        rows.map((log, i) => (
          <View
            key={log._id || i}
            className="flex-row items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"
          >
            <View className="flex-1">
              <Text className="font-montserrat text-sm font-semibold text-gray-200" numberOfLines={1}>{log.playerName}</Text>
              <Text className="mt-0.5 font-montserrat text-xs text-gray-500">
                Sold to <Text className="text-gray-400">{log.teamName}</Text>
              </Text>
            </View>
            <Text className="font-oswald text-sm font-bold text-brand">₹{log.finalPrice?.toLocaleString()}</Text>
          </View>
        ))
      )}
    </View>
  );
}
