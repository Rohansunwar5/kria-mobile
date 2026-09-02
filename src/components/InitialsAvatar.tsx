import { View, Text } from 'react-native';

function isLight(hex: string) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return true;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.45;
}

// Squares now, 4px radius — players and teams alike. Anton, solid fill.
export function InitialsAvatar({
  name,
  size = 40,
  color = '#F97316',
  neutral,
}: {
  name?: string;
  size?: number;
  color?: string;
  neutral?: boolean;
}) {
  const initials = (name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  // 52→19, 38→14, 34→12 on the canvas.
  const fontSize = Math.round(size * 0.37);
  // Team colours are arbitrary — black ink on #F97316, white on a dark blue.
  const ink = neutral ? '#d4d4d4' : isLight(color) ? '#0B0B0B' : '#FFFFFF';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        backgroundColor: neutral ? 'rgba(255,255,255,0.09)' : color,
        ...(neutral ? { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)' } : null),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: 'Anton_400Regular', fontSize, color: ink }}>
        {initials}
      </Text>
    </View>
  );
}
