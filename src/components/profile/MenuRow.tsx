import { Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/icons';

export function MenuRow({
  label,
  icon,
  onPress,
  danger,
  first,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  danger?: boolean;
  /** Rows stack inside one panel; only the first skips its top divider. */
  first?: boolean;
}) {
  const tint = danger ? '#FF4438' : '#fff';
  return (
    <View>
      {first ? null : <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 13, paddingVertical: 13 }}
      >
        <Icon name={icon} size={17} color={danger ? '#FF4438' : '#7d7d7d'} />
        <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: tint }}>{label}</Text>
        <Icon name="chevron-right" size={15} color={danger ? '#FF4438' : '#7d7d7d'} />
      </Pressable>
    </View>
  );
}
