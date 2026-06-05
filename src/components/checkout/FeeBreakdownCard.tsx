import { View, Text } from 'react-native';
import { FeeBreakdown, formatINR } from '@/lib/checkoutView';

function FeeRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className={`font-montserrat text-sm ${bold ? 'font-bold text-white' : 'text-gray-400'}`}>{label}</Text>
      <Text className={`font-montserrat text-sm ${bold ? 'font-bold text-white' : 'text-gray-300'}`}>{value}</Text>
    </View>
  );
}

export function FeeBreakdownCard({ breakdown, categoryName }: { breakdown: FeeBreakdown; categoryName: string }) {
  return (
    <View className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <Text className="mb-4 font-oswald text-base font-bold uppercase tracking-wide text-white" numberOfLines={1}>{categoryName}</Text>
      <FeeRow label="Registration Fee" value={formatINR(breakdown.base)} />
      <FeeRow label="Razorpay Fee (2%)" value={formatINR(breakdown.razorpayFee)} />
      <FeeRow label="Platform Fee (2%)" value={formatINR(breakdown.platformFee)} />
      <FeeRow label="GST (18% on fees)" value={formatINR(breakdown.gst)} />
      <View className="my-3 h-px bg-white/10" />
      <FeeRow label="Total" value={formatINR(breakdown.total)} bold />
      <Text className="mt-3 text-center font-montserrat text-[10px] text-gray-600">Secured by Razorpay</Text>
    </View>
  );
}
