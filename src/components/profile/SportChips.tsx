import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '@/constants/theme';
import { sportName } from '@/lib/homeView';

/** "All" plus one chip per sport; selected = text fill, idle = surface1. `value` null is All. */
export function SportChips({ sports, value, onChange }: { sports: string[]; value: string | null; onChange: (s: string | null) => void }) {
  return (
    <View style={s.row}>
      {[null, ...sports].map((sp) => {
        const on = sp === value;
        return (
          <Pressable key={sp ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(sp)} style={[s.chip, { backgroundColor: on ? colors.text : colors.surface1 }]}>
            <Text style={[s.text, { color: on ? colors.bg : colors.text2 }]}>{sp ? sportName(sp) : 'All'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 18, paddingHorizontal: space.gutter },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  text: { fontFamily: font.semibold, fontSize: 13 },
});
