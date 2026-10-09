import { useEffect, useRef, useState } from 'react';
import { View, Pressable, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Tabs } from 'expo-router';
import { NavIcon, type NavIconName } from '@/components/icons/nav';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { HostSheet } from './HostSheet';
import { DUR, OUT, usePress } from '@/lib/motion';
import { useTheme } from '@/lib/theme';

// expo-router 57 vendors react-navigation, so the tab-bar prop type comes from
// the Tabs component itself — the standalone @react-navigation/bottom-tabs types
// are a different, incompatible copy.
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

type Slot =
  | { kind: 'route'; route: string; icon: NavIconName; label: string }
  | { kind: 'action'; icon: NavIconName; label: string; a11y: string };

/**
 * Five slots: four routes and one action. Host is an ACTION, not a tab: it
 * opens the Host sheet over the current screen and never takes the selected
 * state, so the glass lens only ever marks where you are.
 */
export const NAV_SLOTS: Slot[] = [
  { kind: 'route', route: 'home', icon: 'home', label: 'Home' },
  { kind: 'route', route: 'explore', icon: 'search', label: 'Explore' },
  { kind: 'action', icon: 'create', label: 'Host', a11y: 'Host a match' },
  { kind: 'route', route: 'events', icon: 'calendar', label: 'Events' },
  { kind: 'route', route: 'profile', icon: 'user', label: 'You' },
];

const BAR_HEIGHT = 62;
const INSET = 6;
const fill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

/** The You tab: your photo or initials, round, ringed in orange when selected. */
function AvatarGlyph({ name, photo, focused }: { name: string; photo?: string; focused: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ width: 31, height: 31, borderRadius: 16, borderWidth: 1.5, borderColor: focused ? theme.brandInk : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, overflow: 'hidden' }}>
        <InitialsAvatar name={name} logo={photo} size={24} />
      </View>
    </View>
  );
}

function NavSlot({
  slot,
  focused,
  onPress,
  avatar,
  expanded,
}: {
  slot: Slot;
  focused: boolean;
  onPress: () => void;
  avatar?: { name: string; photo?: string };
  expanded?: boolean;
}) {
  const theme = useTheme();
  const { press, onPressIn, onPressOut } = usePress();
  const squeeze = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.18 }] }));
  const isAvatar = slot.kind === 'route' && slot.route === 'profile' && !!avatar;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={slot.kind === 'action' ? slot.a11y : slot.label}
      accessibilityState={slot.kind === 'action' ? { expanded: !!expanded, disabled: false } : { selected: focused, disabled: false }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={squeeze}>
        {isAvatar ? (
          <AvatarGlyph name={avatar!.name} photo={avatar!.photo} focused={focused} />
        ) : (
          <NavIcon name={slot.icon} size={25} color={focused ? theme.brandInk : theme.text} active={focused} ground={theme.bg} />
        )}
      </Animated.View>
    </Pressable>
  );
}

/**
 * The bottom nav: a floating capsule of frosted glass with a lit top edge.
 * Icons only, Instagram-style — the active one fills in orange, and a lighter
 * pane of glass glides under it. Transform-only motion on the existing
 * out-curve; under reduce-motion the lens jumps instead of gliding.
 */
export function FloatingTabBar({ state, navigation, avatar }: BottomTabBarProps & { avatar?: { name: string; photo?: string } }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [hostOpen, setHostOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const lensX = useSharedValue(0);
  const placed = useRef(false);
  const slotWidth = width > 0 ? (width - INSET * 2) / NAV_SLOTS.length : 0;
  const activeRoute = state.routes[state.index]?.name;
  const activeSlot = NAV_SLOTS.findIndex((s) => s.kind === 'route' && s.route === activeRoute);

  useEffect(() => {
    if (activeSlot < 0 || slotWidth === 0) return;
    const x = activeSlot * slotWidth;
    // The first placement lands; only later tab changes glide.
    lensX.value = reduced || !placed.current ? x : withTiming(x, { duration: DUR.glide, easing: OUT });
    placed.current = true;
  }, [activeSlot, slotWidth, reduced, lensX]);
  const lensStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lensX.value }] }));

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: Math.max(insets.bottom, 12) + 8,
          height: BAR_HEIGHT,
          borderRadius: BAR_HEIGHT / 2,
          shadowColor: theme.shadow,
          shadowOpacity: 0.45,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
        }}
      >
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{
            flex: 1,
            flexDirection: 'row',
            paddingHorizontal: INSET,
            borderRadius: BAR_HEIGHT / 2,
            overflow: 'hidden',
            borderWidth: 0.5,
            borderColor: theme.keyline,
          }}
        >
          <BlurView
            intensity={50}
            tint="dark"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={fill}
          />
          <View style={[fill, { backgroundColor: theme.glass }]} />
          {/* The lit top edge: light catching the glass, not a second blur. */}
          <LinearGradient colors={[theme.fill, 'transparent']} locations={[0, 0.55]} style={fill} pointerEvents="none" />

          {activeSlot >= 0 && slotWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: INSET,
                  bottom: INSET,
                  left: INSET,
                  width: slotWidth,
                  borderRadius: (BAR_HEIGHT - INSET * 2) / 2,
                  backgroundColor: theme.glassLens,
                  borderWidth: 0.5,
                  borderColor: theme.keyline,
                },
                lensStyle,
              ]}
            />
          ) : null}

          {NAV_SLOTS.map((slot, i) => {
            const routeIndex = slot.kind === 'route' ? state.routes.findIndex((r) => r.name === slot.route) : -1;
            const focused = i === activeSlot;
            const onPress = () => {
              if (slot.kind === 'action') {
                setHostOpen(true);
                return;
              }
              const route = state.routes[routeIndex];
              if (!route) return;
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(slot.route);
            };
            return (
              <NavSlot
                key={slot.label}
                slot={slot}
                focused={focused}
                onPress={onPress}
                avatar={avatar}
                expanded={slot.kind === 'action' ? hostOpen : undefined}
              />
            );
          })}
        </View>
      </View>
      <HostSheet visible={hostOpen} onClose={() => setHostOpen(false)} />
    </>
  );
}
