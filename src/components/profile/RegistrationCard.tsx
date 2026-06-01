import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { Registration } from '@/store/slices/registrationSlice';

export function RegistrationCard({ reg, onWithdraw }: { reg: Registration; onWithdraw: (id: string) => void }) {
  const router = useRouter();
  const canWithdraw = reg.status === 'pending' || reg.status === 'approved';
  return (
    <View className="gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <Text className="font-oswald text-lg font-bold text-white">{reg.tournamentDetails?.name || 'Tournament'}</Text>
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="font-montserrat text-sm text-gray-400">Category: {reg.categoryDetails?.name || '—'}</Text>
        <View className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5">
          <Text className="font-montserrat text-xs text-gray-400">Fee: ₹{reg.categoryDetails?.registrationFee || 0}</Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <View className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
          <Text className="font-montserrat text-[10px] uppercase text-gray-300">{reg.status}</Text>
        </View>
        <View className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
          <Text className="font-montserrat text-[10px] uppercase text-gray-300">{reg.paymentStatus} payment</Text>
        </View>
      </View>
      <View className="flex-row gap-3">
        <Pressable onPress={() => router.push(`/tournament/${reg.tournamentId}`)} className="flex-1 items-center rounded-lg bg-white/10 py-2 active:bg-white/20">
          <Text className="font-montserrat text-sm text-white">View</Text>
        </Pressable>
        {canWithdraw && (
          <Pressable onPress={() => onWithdraw(reg._id)} className="flex-1 items-center rounded-lg border border-red-500/40 py-2 active:bg-red-500/10">
            <Text className="font-montserrat text-sm text-red-400">Withdraw</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
