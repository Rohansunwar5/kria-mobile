import { View, Text } from 'react-native';
import { useTheme, type Palette } from '@/lib/theme';

export const LBL = (theme: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: theme.textFaint });

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
      <Text style={{ ...LBL(theme), marginBottom: 8 }}>{title}</Text>
      <View style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}
