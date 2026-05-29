import { View, Text } from 'react-native';

export function InitialsAvatar({ name, size = 40, color = '#F97316' }: { name?: string; size?: number; color?: string }) {
  const initials = (name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}22`, borderColor: `${color}55`, borderWidth: 1 }}
      className="items-center justify-center"
    >
      <Text style={{ color }} className="font-oswald font-bold">{initials}</Text>
    </View>
  );
}
