import { View, Text, Pressable } from 'react-native';

// Four equal segments, solid orange on the active one. Down from eight
// scrolling pills — see IMPLEMENTATION.md: Draw absorbs auction + bracket +
// team league, Info absorbs awards, Players folds into Teams.
export function DetailTabBar<T extends string>({
  tabs,
  active,
  onChange,
  labels,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#0B0B0B', borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      {tabs.map((tab) => {
        const focused = active === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={labels[tab]}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44, // canvas draws 40; hit targets stay 44
              backgroundColor: focused ? '#F97316' : 'transparent',
            }}
          >
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 14, color: focused ? '#0B0B0B' : '#7d7d7d' }}>
              {labels[tab]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
