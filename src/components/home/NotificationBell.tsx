import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/constants/theme';

/** Home header bell. A dot (no count) while anything is new. */
export function NotificationBell({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={count > 0 ? `Notifications, ${count} new` : 'Notifications'} onPress={onPress} style={s.btn}>
      <Icon name="notifications" size={22} />
      {count > 0 ? <View testID="bell-dot" style={s.dot} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 11, right: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface1, boxSizing: 'content-box' },
});
