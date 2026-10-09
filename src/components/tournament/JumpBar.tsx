import { View, Text, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Icon } from '@/components/icons';
import { heroParallax } from '@/lib/motion';
import { useTheme } from '@/lib/theme';

export const JUMP_BAR_HEIGHT = 46;
const BACK = 44;

/**
 * The sticky bar under the hero: one chip per section, tap to scroll there.
 * Once the banner scrolls away a back button slides in at its left — the
 * whole row moves (transform only), so nothing re-lays out.
 */
export function JumpBar({
  sections,
  active,
  onJump,
  onBack,
  scrollY,
}: {
  sections: { key: string; label: string }[];
  active: number;
  onJump: (index: number) => void;
  onBack: () => void;
  scrollY: SharedValue<number>;
}) {
  const theme = useTheme();
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (heroParallax(scrollY.value).bar - 1) * BACK }] }));
  const backStyle = useAnimatedStyle(() => ({ opacity: heroParallax(scrollY.value).bar }));

  return (
    <View style={{ height: JUMP_BAR_HEIGHT, overflow: 'hidden', backgroundColor: theme.bg, borderBottomWidth: 1.5, borderBottomColor: theme.lineSoft }}>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'stretch', height: '100%' }, rowStyle]}>
        <Animated.View style={backStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={{ width: BACK, height: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chevron-left" size={17} color={theme.text} strokeWidth={2.2} />
          </Pressable>
        </Animated.View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
          {sections.map((s, i) => {
            const on = i === active;
            return (
              <Pressable
                key={s.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Jump to ${s.label}`}
                onPress={() => onJump(i)}
                style={{ justifyContent: 'center', paddingHorizontal: 9, borderBottomWidth: 3, borderBottomColor: on ? theme.brand : theme.bg }}
              >
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.1 * 10, textTransform: 'uppercase', color: on ? theme.text : theme.textFaint }}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}
