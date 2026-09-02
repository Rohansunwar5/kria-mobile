import { View, ScrollView } from 'react-native';
import { Chip } from '@/components/canvas';

// The round rail from Bracket.dc.html. Wrapped in a non-flex View so the
// horizontal ScrollView sizes to its content height instead of filling the
// parent (which stretched the chips into full-height columns).
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
    <View style={{ borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 6, alignItems: 'center' }}
      >
        {rounds.map((r) => (
          <Chip key={r} label={r} selected={active === r} onPress={() => onSelect(r)} />
        ))}
      </ScrollView>
    </View>
  );
}
