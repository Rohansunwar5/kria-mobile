import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '@/constants/theme';
import { Icon, type IconName } from './Icon';

/** Pushed-screen header (mocks 1d/1e): 44px icon button, centred title, right slot. */
export function TopBar({ title, icon = 'arrow_back', onBack, right }: {
  title: string;
  icon?: IconName;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.top}>
      <Pressable accessibilityRole="button" accessibilityLabel={icon === 'close' ? 'Close' : 'Back'} onPress={onBack} style={s.iconBtn}>
        <Icon name={icon} size={24} />
      </Pressable>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      <View style={s.iconBtn}>{right}</View>
    </View>
  );
}

export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.iconBtn}>
      <Icon name={icon} size={22} />
    </Pressable>
  );
}

/** Actions pinned under the scroll, clear of the home indicator. */
export function FooterBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 10) + 12 }]}>{children}</View>;
}

const s = StyleSheet.create({
  top: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: font.semibold, fontSize: 15, color: colors.text },
  footer: { flexDirection: 'row', gap: 10, paddingTop: 12, paddingHorizontal: 20, backgroundColor: colors.bg },
});
