import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Tabs } from 'expo-router';
import { NavIcon, type NavIconName } from '@/components/icons/nav';
import { colors } from '@/lib/theme';

// expo-router 57 vendors react-navigation, so the tab-bar prop type comes from
// the Tabs component itself — the standalone @react-navigation/bottom-tabs types
// are a different, incompatible copy.
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

// expo-router's typed routes narrow Href to the known-route union, which
// widens to plain `string` if declared by hand — pull the param type straight
// off `router.push` instead so this stays in sync with the generated routes.
type Slot =
  | { kind: 'route'; route: string; icon: NavIconName; label: string }
  | { kind: 'action'; href: Parameters<typeof router.push>[0]; icon: NavIconName; label: string; a11y: string }
  | { kind: 'pending'; icon: NavIconName; label: string };

/**
 * Five slots, but only two routes exist. Explore and Live are drawn so the bar
 * reads as designed and are announced disabled — a control that looks tappable
 * and does nothing is worse than one that says it is not ready.
 *
 * Host is an ACTION, not a tab: it pushes /quick/new and never takes the
 * selected state. That is deliberate — the lifted circle always means "create",
 * so the lift never competes with which tab you are on.
 */
export const NAV_SLOTS: Slot[] = [
  { kind: 'route', route: 'home', icon: 'home', label: 'Home' },
  { kind: 'pending', icon: 'search', label: 'Explore' },
  { kind: 'action', href: '/quick/new', icon: 'plus', label: 'Host', a11y: 'Host a match' },
  { kind: 'pending', icon: 'live', label: 'Live' },
  { kind: 'route', route: 'profile', icon: 'user', label: 'You' },
];

const IDLE = '#7d7d7d';
const PENDING = 'rgba(255,255,255,0.28)';

const label = (color: string) => ({
  fontFamily: 'SpaceGrotesk_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.03 * 9,
  color,
  marginTop: 3,
});

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: Math.max(insets.bottom, 12) + 8,
        height: 64,
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: colors.panel,
        borderWidth: 1.5,
        borderColor: colors.line,
        borderRadius: 32,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
      }}
    >
      {NAV_SLOTS.map((slot) => {
        const routeIndex =
          slot.kind === 'route' ? state.routes.findIndex((r) => r.name === slot.route) : -1;
        const focused = routeIndex >= 0 && state.index === routeIndex;
        const disabled = slot.kind === 'pending';
        const a11yLabel = slot.kind === 'action' ? slot.a11y : slot.label;

        const onPress = () => {
          if (slot.kind === 'pending') return;
          if (slot.kind === 'action') {
            router.push(slot.href);
            return;
          }
          const route = state.routes[routeIndex];
          if (!route) return;
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(slot.route);
        };

        // The create action: a lifted circle ringed in the page ground, so the
        // ring reads as a notch cut into the bar.
        if (slot.kind === 'action') {
          return (
            <Pressable
              key={slot.label}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityState={{ selected: false, disabled: false }}
              onPress={onPress}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  marginTop: -30,
                  backgroundColor: colors.auction,
                  borderWidth: 5,
                  borderColor: colors.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NavIcon name={slot.icon} size={24} color="#240614" strokeWidth={2.2} />
              </View>
              <Text style={label('#FFFFFF')}>{slot.label}</Text>
            </Pressable>
          );
        }

        const tint = disabled ? PENDING : focused ? colors.brand : IDLE;

        return (
          <Pressable
            key={slot.label}
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
            accessibilityState={{ selected: focused, disabled }}
            disabled={disabled}
            onPress={onPress}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NavIcon name={slot.icon} size={22} color={tint} />
            <Text style={label(tint)}>{slot.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
