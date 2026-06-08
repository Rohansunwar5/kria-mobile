import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

export function MenuRow({
  label,
  icon,
  onPress,
  danger,
}: {
  label: string;
  icon: IoniconName;
  onPress: () => void;
  danger?: boolean;
}) {
  const tint = danger ? '#f87171' : '#FFFFFF';
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 active:bg-white/10"
    >
      <View className="flex-row items-center gap-3">
        <View className={`h-9 w-9 items-center justify-center rounded-full ${danger ? 'bg-red-500/10' : 'bg-white/8'}`}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Text className={`font-montserrat text-base ${danger ? 'text-red-400' : 'text-white'}`}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={danger ? '#f87171' : '#6b6b6b'} />
    </Pressable>
  );
}
