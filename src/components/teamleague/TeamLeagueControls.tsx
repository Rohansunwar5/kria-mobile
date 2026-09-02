import { View, ScrollView } from 'react-native';
import { Chip } from '@/components/canvas';

export type TLView = 'overall' | 'standings' | 'ties';

export function StageSelector({ maxStage, stage, onSelect }: { maxStage: number; stage: number; onSelect: (s: number) => void }) {
  if (maxStage <= 1) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingVertical: 8 }}>
      {Array.from({ length: maxStage }, (_, i) => i + 1).map((s) => (
        <Chip key={s} label={`Stage ${s}`} selected={stage === s} onPress={() => onSelect(s)} />
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
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      {items.map((it) => (
        <Chip key={it.key} label={it.label} selected={value === it.key} onPress={() => onChange(it.key)} />
      ))}
    </View>
  );
}
