import { View, Text, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { StatusPill } from '@/components/StatusPill';
import { formatShortDate } from '@/lib/format';

type IoniconName = keyof typeof Ionicons.glyphMap;

function Stat({ icon, value, label }: { icon: IoniconName; value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Ionicons name={icon} size={16} color="#F97316" />
      <Text className="mt-1 font-oswald text-lg text-white">{value}</Text>
      <Text className="font-montserrat text-[10px] uppercase tracking-wider text-gray-500">{label}</Text>
    </View>
  );
}

export function TournamentHero({ tournament, onBack }: { tournament: Tournament; onBack: () => void }) {
  return (
    <View>
      <View className="relative h-72 w-full">
        {tournament.bannerImage ? (
          <Image source={{ uri: tournament.bannerImage }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full bg-[#1a1a1a]" />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.05)', 'rgba(17,17,17,0.55)', '#111111']}
          locations={[0, 0.35, 0.75, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />

        <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-4">
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/40"
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>

        <View className="absolute bottom-0 left-0 right-0 gap-2 px-5 pb-4">
          <View className="flex-row gap-2">
            <StatusPill status={tournament.status} />
            <View className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1">
              <Text className="font-montserrat text-[10px] font-bold uppercase text-white">
                {tournament.sport?.replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Text className="font-oswald uppercase text-white" style={{ fontSize: 34, lineHeight: 36, paddingTop: 2 }}>
            {tournament.name}
          </Text>
          <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="location-outline" size={14} color="#F97316" />
              <Text className="font-montserrat text-xs text-gray-200">
                {tournament.venue?.name}{tournament.venue?.city ? `, ${tournament.venue.city}` : ''}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={14} color="#F97316" />
              <Text className="font-montserrat text-xs text-gray-200">
                {formatShortDate(tournament.startDate)} – {formatShortDate(tournament.endDate)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats strip */}
      <View className="mx-5 -mt-2 mb-2 flex-row items-center rounded-2xl border border-white/10 bg-white/5 py-4">
        <Stat icon="people-outline" value={tournament.registeredPlayersCount ?? 0} label="Players" />
        <View className="h-8 w-px bg-white/10" />
        <Stat icon="shield-outline" value={`${tournament.teamsCount ?? 0}/${tournament.settings?.maxTeams ?? '∞'}`} label="Teams" />
      </View>
    </View>
  );
}
