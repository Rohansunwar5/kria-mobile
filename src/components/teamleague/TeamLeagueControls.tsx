import { View, Text, Pressable, ScrollView } from 'react-native';

export type TLView = 'overall' | 'standings' | 'ties';

export function StageSelector({ maxStage, stage, onSelect }: { maxStage: number; stage: number; onSelect: (s: number) => void }) {
  if (maxStage <= 1) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
      {Array.from({ length: maxStage }, (_, i) => i + 1).map((s) => (
        <Pressable key={s} onPress={() => onSelect(s)} className={`rounded-full px-4 py-1.5 ${stage === s ? 'bg-brand' : 'bg-white/5'}`}>
          <Text className={`font-montserrat text-xs font-bold ${stage === s ? 'text-white' : 'text-gray-400'}`}>Stage {s}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function ViewSegment({ value, onChange }: { value: TLView; onChange: (v: TLView) => void }) {
  const items: { key: TLView; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'standings', label: 'Standings' },
    { key: 'ties', label: 'Ties' },
  ];
  return (
    <View className="mx-4 mb-1 flex-row rounded-xl bg-black/30 p-1">
      {items.map((it) => (
        <Pressable key={it.key} onPress={() => onChange(it.key)} className={`flex-1 items-center rounded-lg py-2 ${value === it.key ? 'bg-brand/20' : ''}`}>
          <Text className={`font-montserrat text-xs font-semibold ${value === it.key ? 'text-brand' : 'text-gray-400'}`}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
