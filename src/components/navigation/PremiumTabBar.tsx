import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ICONS: Record<string, { icon: IconName; label: string }> = {
  home: { icon: 'trophy', label: 'Events' },
  profile: { icon: 'person', label: 'Me' },
};

const INACTIVE = 'rgba(11,11,11,0.62)';

// Solid orange bar with a black active pill (.tabbar / .tabitem in _head.html),
// replacing the v1 dark floating pill.
export function PremiumTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: Math.max(insets.bottom, 12),
        flexDirection: 'row',
        gap: 5,
        padding: 5,
        backgroundColor: '#F97316',
        borderRadius: 7,
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 10 },
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
              gap: 7,
              paddingVertical: 12,
              minHeight: 44, // canvas draws 41; hit targets stay 44
              borderRadius: 4,
              backgroundColor: focused ? '#0B0B0B' : 'transparent',
            }}
          >
            <Icon name={meta.icon} size={17} color={focused ? '#FFFFFF' : INACTIVE} filled={focused} />
            <Text
              style={{
                fontFamily: 'Anton_400Regular',
                fontSize: 13,
                letterSpacing: 0.05 * 13,
                textTransform: 'uppercase',
                color: focused ? '#FFFFFF' : INACTIVE,
              }}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
