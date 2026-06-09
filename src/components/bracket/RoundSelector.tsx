import { View, ScrollView, Pressable, Text } from 'react-native';

export function RoundSelector({
  rounds,
  active,
  onSelect,
}: {
  rounds: string[];
  active: string;
  onSelect: (r: string) => void;
}) {
  // Wrap in a non-flex View so the horizontal ScrollView sizes to its content
  // height instead of expanding to fill the parent (which stretched the round
  // pills into full-height columns).
  return (
    <View className="border-b border-white/10">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' }}
      >
        {rounds.map((r) => (
          <Pressable
            key={r}
            onPress={() => onSelect(r)}
            className={`rounded-full px-4 py-2 ${active === r ? 'bg-brand' : 'border border-white/10 bg-white/5'}`}
          >
            <Text
              className={`font-montserrat text-xs font-bold uppercase tracking-wider ${active === r ? 'text-white' : 'text-gray-400'}`}
              numberOfLines={1}
            >
              {r}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
