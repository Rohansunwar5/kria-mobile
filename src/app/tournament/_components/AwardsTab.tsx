import { View, Text } from 'react-native';
import { InitialsAvatar } from '@/components/InitialsAvatar';

export function AwardsTab({ awards }: { awards: any[] }) {
  if (!awards || awards.length === 0) {
    return (
      <View className="items-center px-5 py-16">
        <Text className="mb-2 font-oswald text-xl font-bold text-white">No Awards Yet</Text>
        <Text className="text-center font-montserrat text-gray-400">
          Awards are distributed after categories conclude. Check back later!
        </Text>
      </View>
    );
  }
  return (
    <View className="gap-4 px-5 py-6">
      {awards.map((award, i) => {
        const recipient = award.player?.profile
          ? `${award.player.profile.firstName || ''} ${award.player.profile.lastName || ''}`.trim() || award.player.profile.name
          : award.team?.name || 'Unknown Recipient';
        return (
          <View key={award._id || i} className="rounded-2xl border border-white/10 bg-black/40 p-5">
            <Text className="mb-1 font-oswald text-xl font-bold uppercase text-white">{award.title}</Text>
            <Text className="mb-4 font-montserrat text-sm text-gray-400">
              {award.description || 'Recognized for outstanding performance.'}
            </Text>
            <View className="flex-row items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
              <InitialsAvatar name={recipient} color="#A855F7" />
              <View>
                <Text className="font-montserrat font-medium text-white">{recipient}</Text>
                <Text className="font-montserrat text-xs text-purple-400">
                  {award.player ? (award.team ? `Player • ${award.team.name}` : 'Player Award') : 'Team Award'}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
