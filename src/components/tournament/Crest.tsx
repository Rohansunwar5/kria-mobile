import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '@/constants/theme';
import { initials } from '@/lib/matchCard';

/** Round logo on the light crest circle (DESIGN §12); initials when there is no logo. */
export function Crest({ uri, name, size }: { uri?: string; name: string; size: number }) {
  return (
    <View style={[s.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} accessibilityIgnoresInvertColors style={{ width: size, height: size }} />
      ) : (
        <Text style={[s.text, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { fontFamily: font.bold, color: colors.bg },
});
