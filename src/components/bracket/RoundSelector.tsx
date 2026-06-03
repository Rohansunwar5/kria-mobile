import { ScrollView, Pressable, Text } from 'react-native';

export function RoundSelector({
  rounds,
  active,
  onSelect,
}: {
  rounds: string[];
  active: string;
  onSelect: (r: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
    >
      {rounds.map((r) => (
        <Pressable key={r} onPress={() => onSelect(r)} className={`rounded-xl px-4 py-2 ${active === r ? 'bg-brand' : 'bg-white/5'}`}>
          <Text
            className={`font-montserrat text-xs font-bold uppercase tracking-wider ${active === r ? 'text-white' : 'text-gray-400'}`}
            numberOfLines={1}
          >
            {r}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
