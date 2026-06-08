import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

type IoniconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { active: IoniconName; inactive: IoniconName; label: string }> = {
  home: { active: 'trophy', inactive: 'trophy-outline', label: 'Tournaments' },
  profile: { active: 'person', inactive: 'person-outline', label: 'Profile' },
};

// Floating rounded dark tab bar with an active orange pill, in the Nike/Strava
// vein. Custom-rendered so we control elevation, spacing, and the active state.
export function PremiumTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 12),
        flexDirection: 'row',
        backgroundColor: 'rgba(24,24,24,0.96)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderRadius: 28,
        padding: 6,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
      }}
    >
      {state.routes.map((route, index) => {
        const meta = ICONS[route.name];
        if (!meta) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={meta.label}
            onPress={onPress}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              borderRadius: 22,
              backgroundColor: focused ? '#F97316' : 'transparent',
            }}
          >
            <Ionicons
              name={focused ? meta.active : meta.inactive}
              size={20}
              color={focused ? '#FFFFFF' : '#9a9a9a'}
            />
            {focused ? (
              <Text style={{ fontFamily: 'Montserrat_400Regular', fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>
                {meta.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
