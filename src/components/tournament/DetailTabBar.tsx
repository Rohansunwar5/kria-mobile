import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

const META: Record<string, { icon: IoniconName; label: string }> = {
  overview: { icon: 'information-circle-outline', label: 'Overview' },
  categories: { icon: 'list-outline', label: 'Categories' },
  auction: { icon: 'pricetags-outline', label: 'Auction' },
  bracket: { icon: 'git-network-outline', label: 'Bracket' },
  teamLeague: { icon: 'trophy-outline', label: 'Team League' },
  players: { icon: 'people-outline', label: 'Players' },
  teams: { icon: 'shield-outline', label: 'Teams' },
  awards: { icon: 'medal-outline', label: 'Awards' },
};

export function DetailTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: T[];
  active: T;
  onChange: (tab: T) => void;
}) {
  return (
    <View className="border-b border-white/10 bg-ink">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
      >
        {tabs.map((tab) => {
          const meta = META[tab] || { icon: 'ellipse-outline' as IoniconName, label: tab };
          const focused = active === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => onChange(tab)}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 ${focused ? 'bg-brand' : 'border border-white/10 bg-white/5'}`}
            >
              <Ionicons name={meta.icon} size={15} color={focused ? '#fff' : '#9a9a9a'} />
              <Text className={`font-montserrat text-sm ${focused ? 'font-semibold text-white' : 'text-gray-400'}`}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
