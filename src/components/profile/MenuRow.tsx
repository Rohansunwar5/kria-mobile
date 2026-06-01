import { Pressable, Text, View } from 'react-native';

export function MenuRow({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 active:bg-white/10"
    >
      <Text className={`font-montserrat text-base ${danger ? 'text-red-400' : 'text-white'}`}>{label}</Text>
      <Text className={`text-lg ${danger ? 'text-red-400' : 'text-gray-500'}`}>›</Text>
    </Pressable>
  );
}
