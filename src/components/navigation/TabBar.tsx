import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, ease, font, motion, radius } from '@/constants/theme';

// expo-router 57 vendors react-navigation: take the prop type from Tabs itself.
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

export const TABS: { route: string; label: string; icon?: IconName }[] = [
  { route: 'home', label: 'Home', icon: 'home' },
  { route: 'compete', label: 'Compete', icon: 'leaderboard' },
  { route: 'events', label: 'Events', icon: 'stadium' },
  { route: 'awards', label: 'Awards', icon: 'military_tech' },
  { route: 'profile', label: 'Profile' },
];

/** Scroll padding a tab screen needs so its last row clears the bar (plus the bottom inset). */
export const TAB_BAR_SPACE = 96;

/**
 * DESIGN §5.1 + Motion "Tab pill": floating bar, one surface3 pill that
 * travels to the active tab in 280ms with a soft decelerate, no bounce.
 */
export function TabBar({ state, navigation, avatar }: BottomTabBarProps & { avatar?: { initials: string; photo?: string } }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const active = TABS.findIndex((t) => t.route === state.routes[state.index]?.name);
  const [width, setWidth] = useState(0);
  const slot = (width - 2) / TABS.length; // inside the 1px ring
  const x = useSharedValue(active);

  useEffect(() => {
    x.value = reduced ? active : withTiming(active, { duration: motion.tab, easing: ease.tab });
  }, [active, reduced, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * slot }] }));

  return (
    <View pointerEvents="box-none" style={[s.wrap, { paddingBottom: Math.max(insets.bottom - 8, 12) }]}>
      <LinearGradient pointerEvents="none" colors={[colors.bgClear, colors.bg]} locations={[0, 0.34]} style={StyleSheet.absoluteFill} />
      <View style={s.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {width && active >= 0 ? <Animated.View style={[s.pill, { width: slot - 6 }, pill]} /> : null}
        {TABS.map((tab, i) => {
          const on = i === active;
          const route = state.routes.find((r) => r.name === tab.route);
          const ink = on ? colors.text : colors.navIdle;
          return (
            <Pressable
              key={tab.route}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (!route) return;
                // Re-tapping the active tab lets the screen scroll to top (useScrollToTop).
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!on && !event.defaultPrevented) navigation.navigate(tab.route);
              }}
              style={s.item}
            >
              <View style={s.glyph}>
                {tab.icon ? (
                  <Icon name={tab.icon} size={23} color={on ? colors.accent : colors.navIdle} variant={on ? 'f' : 'o'} />
                ) : (
                  <View style={[s.avatar, { borderColor: on ? colors.accent : colors.ring }]}>
                    {avatar?.photo ? <Image source={{ uri: avatar.photo }} style={StyleSheet.absoluteFill} /> : <Text style={s.initials}>{avatar?.initials ?? ''}</Text>}
                  </View>
                )}
              </View>
              <Text style={[s.label, { color: ink, fontFamily: on ? font.bold : font.medium }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 16, paddingHorizontal: 12 },
  bar: {
    height: 64, borderRadius: radius.nav, backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.navRing,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: colors.shadow, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  pill: { position: 'absolute', top: 5, left: 3, height: 52, borderRadius: 18, backgroundColor: colors.surface3 },
  item: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', gap: 2 },
  glyph: { height: 26, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: font.bold, fontSize: 9, color: colors.text },
  label: { fontSize: 10.5 },
});
