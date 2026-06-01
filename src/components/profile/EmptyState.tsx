import { View, Text, Pressable } from 'react-native';

export function EmptyState({ message, cta, onCta }: { message: string; cta?: string; onCta?: () => void }) {
  return (
    <View className="items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-10">
      <Text className="text-center font-montserrat text-gray-400">{message}</Text>
      {cta && onCta && (
        <Pressable onPress={onCta} className="rounded-full bg-brand px-6 py-2 active:opacity-80">
          <Text className="font-montserrat font-semibold text-white">{cta}</Text>
        </Pressable>
      )}
    </View>
  );
}
