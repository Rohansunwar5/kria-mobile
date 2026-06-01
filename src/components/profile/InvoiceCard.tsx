import { View, Text } from 'react-native';
import type { Invoice } from '@/api/payment';
import { formatDate } from '@/lib/format';

export function InvoiceCard({ inv }: { inv: Invoice }) {
  return (
    <View className="flex-row justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
      <View className="flex-1">
        <Text className="font-oswald text-base font-bold text-white" numberOfLines={1}>{inv.tournament?.name || 'Tournament'}</Text>
        {!!inv.category?.name && <Text className="font-montserrat text-sm text-gray-400">Category: {inv.category.name}</Text>}
        <View className="mt-1 flex-row items-center gap-2">
          <View className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5">
            <Text className="font-montserrat text-[10px] uppercase text-emerald-400">{inv.status}</Text>
          </View>
          <Text className="font-montserrat text-xs text-gray-500">{formatDate(inv.createdAt)}</Text>
        </View>
      </View>
      <View className="items-end justify-center">
        <Text className="font-oswald text-[10px] uppercase tracking-wider text-gray-500">Paid</Text>
        <Text className="font-oswald text-xl font-bold text-brand">₹{inv.amount?.toLocaleString()}</Text>
      </View>
    </View>
  );
}
