import { View, Text, Image } from 'react-native';

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// Renders a team's logo when available, otherwise a colored initials chip.
export function TeamLogo({
  name,
  logo,
  color = '#F97316',
  size = 28,
}: {
  name?: string;
  logo?: string;
  color?: string;
  size?: number;
}) {
  if (logo) {
    return (
      <Image
        source={{ uri: logo }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#000' }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}22`,
        borderWidth: 1,
        borderColor: `${color}55`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: 'Oswald_500Medium', fontSize: size * 0.4, color }}>{initials(name)}</Text>
    </View>
  );
}
