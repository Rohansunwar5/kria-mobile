import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { colors, font, space } from '@/constants/theme';
import { useLiveNow } from '@/lib/useLiveNow';

/** Home entry to 3a: only when something is live. */
export function LiveNowRow() {
  const { count } = useLiveNow({ scores: false });
  if (!count) return null;
  return (
    <View style={s.wrap}>
      <Tap scale={0.99} accessibilityRole="link" onPress={() => router.push('/live')} style={s.row}>
        <Text style={s.title}>Live now</Text>
        <View style={s.right}>
          <Text style={s.meta}>{`${count} ${count === 1 ? 'match' : 'matches'}`}</Text>
          <Icon name="chevron_right" size={20} color={colors.text3} />
        </View>
      </Tap>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: space.sectionGap, paddingHorizontal: space.gutter },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.text3, fontVariant: ['tabular-nums'] },
});
