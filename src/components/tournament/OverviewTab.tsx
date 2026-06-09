import { View, Text, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Team } from '@/store/slices/teamSlice';
import type { Registration } from '@/store/slices/registrationSlice';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { formatDate } from '@/lib/format';

type IoniconName = keyof typeof Ionicons.glyphMap;

function FactCard({ icon, label, value }: { icon: IoniconName; label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <View className="mb-2 h-8 w-8 items-center justify-center rounded-full bg-brand/15">
        <Ionicons name={icon} size={16} color="#F97316" />
      </View>
      <Text className="font-montserrat text-[10px] uppercase tracking-wider text-gray-500">{label}</Text>
      <Text numberOfLines={2} className="mt-0.5 font-oswald text-base text-white">{value}</Text>
    </View>
  );
}

export function OverviewTab({
  tournament, user, myTeam, myTeamAssignment, isTeamDataReady,
}: {
  tournament: Tournament;
  user: any;
  myTeam: Team | null | undefined;
  myTeamAssignment: Registration | undefined;
  isTeamDataReady: boolean;
}) {
  const color = myTeam?.primaryColor || '#F97316';

  return (
    <View className="gap-6 px-5 py-6">
      {user && isTeamDataReady && myTeam && (
        <View className="gap-3 rounded-3xl border p-5" style={{ borderColor: `${color}50`, backgroundColor: `${color}12` }}>
          <View className="flex-row items-center gap-2 self-start rounded-full px-3 py-1" style={{ backgroundColor: color }}>
            <Ionicons name="sparkles" size={12} color="#fff" />
            <Text className="font-montserrat text-[10px] font-bold uppercase text-white">You&apos;ve been drafted!</Text>
          </View>
          <Text className="font-montserrat text-xs uppercase tracking-widest text-gray-400">Your Team</Text>
          <Text className="font-oswald text-3xl uppercase text-white">{myTeam.name}</Text>
          {myTeamAssignment?.auctionData?.soldPrice ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="pricetag" size={13} color={color} />
              <Text style={{ color }} className="font-montserrat text-sm">
                Sold for ₹{myTeamAssignment.auctionData.soldPrice.toLocaleString()}
              </Text>
            </View>
          ) : null}
          {myTeam.whatsappGroupLink ? (
            <Pressable
              onPress={() => Linking.openURL(myTeam.whatsappGroupLink!)}
              className="mt-1 flex-row items-center gap-2 self-start rounded-2xl px-5 py-3"
              style={{ backgroundColor: '#128C7E' }}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text className="font-montserrat font-bold text-white">Join Team WhatsApp Group</Text>
            </Pressable>
          ) : (
            <Text className="font-montserrat text-sm text-gray-500">WhatsApp link not added yet — check back later</Text>
          )}
        </View>
      )}

      {/* Quick facts */}
      <View className="gap-3">
        <View className="flex-row gap-3">
          <FactCard icon="calendar-outline" label="Starts" value={formatDate(tournament.startDate)} />
          <FactCard icon="flag-outline" label="Ends" value={formatDate(tournament.endDate)} />
        </View>
        <View className="flex-row gap-3">
          <FactCard
            icon="location-outline"
            label="Venue"
            value={tournament.venue?.name || tournament.venue?.city || 'TBD'}
          />
          <FactCard
            icon="hourglass-outline"
            label="Reg. deadline"
            value={tournament.registrationDeadline ? formatDate(tournament.registrationDeadline) : 'TBD'}
          />
        </View>
      </View>

      <View>
        <View className="mb-3 flex-row items-center gap-2">
          <Ionicons name="document-text-outline" size={18} color="#F97316" />
          <Text className="font-oswald text-2xl uppercase text-white">About</Text>
        </View>
        <Text className="font-montserrat leading-relaxed text-gray-300">
          {tournament.description || 'No description provided for this tournament.'}
        </Text>
      </View>
    </View>
  );
}
