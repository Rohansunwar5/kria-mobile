import { View, Text, Pressable } from 'react-native';
import { useTheme, useThemeMode, type ThemeMode } from '@/lib/theme';
import { Section } from '@/app/profile/settings';

/**
 * The single gate on light mode reaching users.
 *
 * Light mode is only correct on a screen whose colour literals have become
 * tokens. Until the migration finishes, a user who switched would see
 * hardcoded near-black cards on paper on every unmigrated screen — which
 * reads as broken, not as partial. Everything behind this flag is built,
 * tested and working; flipping it to `true` is the release step, and it
 * belongs in the commit that migrates the last file.
 */
export const SHOW_APPEARANCE_CONTROL = false;

const OPTIONS: ReadonlyArray<{ mode: ThemeMode; label: string; hint: string }> = [
  { mode: 'system', label: 'System', hint: 'Follow the phone' },
  { mode: 'light', label: 'Light', hint: 'Paper' },
  { mode: 'dark', label: 'Dark', hint: 'The default' },
];

export default function AppearanceSection({ forceVisible = false }: { forceVisible?: boolean }) {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();

  if (!SHOW_APPEARANCE_CONTROL && !forceVisible) return null;

  return (
    <Section title="Appearance">
      <View accessibilityRole="radiogroup">
        {OPTIONS.map((option, index) => {
          const selected = mode === option.mode;
          return (
            <Pressable
              key={option.mode}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => setMode(option.mode)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                minHeight: 52,
                borderTopWidth: index === 0 ? 0 : 1.5,
                borderTopColor: theme.lineFaint,
                backgroundColor: selected ? theme.brandTint : 'transparent',
              }}
            >
              <View>
                <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: theme.text }}>
                  {option.label}
                </Text>
                <Text
                  style={{
                    fontFamily: 'SpaceMono_400Regular',
                    fontSize: 9,
                    letterSpacing: 0.08 * 9,
                    textTransform: 'uppercase',
                    color: theme.textFaint,
                    marginTop: 4,
                  }}
                >
                  {option.hint}
                </Text>
              </View>
              {/* Colour is never the only signal — the selected row carries a
                  word, not just a tint. DESIGN.md §7. */}
              {selected ? (
                <Text
                  style={{
                    fontFamily: 'SpaceMono_700Bold',
                    fontSize: 9,
                    letterSpacing: 0.1 * 9,
                    textTransform: 'uppercase',
                    color: theme.brandInk,
                  }}
                >
                  On
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Section>
  );
}
