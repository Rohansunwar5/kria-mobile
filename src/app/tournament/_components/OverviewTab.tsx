import { View, Text, Pressable, Linking } from 'react-native';
import type { Team } from '@/store/slices/teamSlice';
import type { Registration } from '@/store/slices/registrationSlice';

export function OverviewTab({
  description, user, myTeam, myTeamAssignment, isTeamDataReady,
}: {
  description?: string;
  user: any;
  myTeam: Team | null | undefined;
  myTeamAssignment: Registration | undefined;
  isTeamDataReady: boolean;
}) {
  const color = myTeam?.primaryColor || '#F97316';
  return (
    <View className="gap-6 px-5 py-6">
      {user && isTeamDataReady && myTeam && (
        <View className="gap-4 rounded-3xl border p-5" style={{ borderColor: `${color}50`, backgroundColor: `${color}12` }}>
          <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: color }}>
            <Text className="font-montserrat text-[10px] font-bold uppercase text-white">🎉 You've been drafted!</Text>
          </View>
          <Text className="font-montserrat text-xs uppercase tracking-widest text-gray-400">Your Team</Text>
          <Text className="font-oswald text-3xl font-black text-white">{myTeam.name}</Text>
          {myTeamAssignment?.auctionData?.soldPrice ? (
            <Text style={{ color }} className="font-montserrat text-sm">
              Sold for ₹{myTeamAssignment.auctionData.soldPrice.toLocaleString()}
            </Text>
          ) : null}
          {myTeam.whatsappGroupLink ? (
            <Pressable onPress={() => Linking.openURL(myTeam.whatsappGroupLink!)} className="mt-1 self-start rounded-2xl px-5 py-3" style={{ backgroundColor: '#128C7E' }}>
              <Text className="font-montserrat font-bold text-white">Join Team WhatsApp Group</Text>
            </Pressable>
          ) : (
            <Text className="font-montserrat text-sm text-gray-500">WhatsApp link not added yet — check back later</Text>
          )}
        </View>
      )}

      <View>
        <Text className="mb-3 font-oswald text-2xl font-bold text-white">About the Tournament</Text>
        <Text className="font-montserrat leading-relaxed text-gray-300">
          {description || 'No description provided for this tournament.'}
        </Text>
      </View>
    </View>
  );
}
