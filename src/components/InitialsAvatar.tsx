import { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { SvgUri } from 'react-native-svg';

function isLight(hex: string) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return true;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.45;
}

/**
 * React Native's <Image> cannot decode SVG — it renders an empty box and says
 * nothing. Every seeded team logo and player photo in this project is a DiceBear
 * SVG (`api.dicebear.com/9.x/<style>/svg?seed=…`), which is why whole screens
 * looked blank while the same URLs rendered fine in the web client.
 *
 * Matches both a `.svg` path and DiceBear's extensionless `/svg?` form.
 */
export function isSvgUrl(url?: string): boolean {
  if (!url) return false;
  const withoutQuery = url.split('?')[0].toLowerCase();
  return withoutQuery.endsWith('.svg') || withoutQuery.endsWith('/svg');
}

// Squares now, 4px radius — players and teams alike. Anton, solid fill.
// A real crest beats initials whenever one exists.
export function InitialsAvatar({
  name,
  size = 40,
  color = '#F97316',
  neutral,
  logo,
}: {
  name?: string;
  size?: number;
  color?: string;
  neutral?: boolean;
  /** Team crest or player photo. Falls back to initials when absent, blank or unloadable. */
  logo?: string;
}) {
  const uri = logo?.trim();
  const [failed, setFailed] = useState(false);

  // A new URL deserves a fresh attempt — otherwise one dead image poisons the
  // slot for every row this component is recycled into.
  useEffect(() => setFailed(false), [uri]);

  if (uri && !failed) {
    const box = {
      width: size,
      height: size,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.06)',
      overflow: 'hidden' as const,
    };

    if (isSvgUrl(uri)) {
      return (
        <View accessibilityLabel={name} style={box}>
          <SvgUri
            testID="avatar-svg"
            uri={uri}
            width={size}
            height={size}
            onError={() => setFailed(true)}
          />
        </View>
      );
    }

    return (
      <Image
        testID="avatar-image"
        accessibilityLabel={name}
        source={{ uri }}
        resizeMode="cover"
        onError={() => setFailed(true)}
        style={box}
      />
    );
  }

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
