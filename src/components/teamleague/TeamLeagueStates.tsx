import { View, Text } from 'react-native';

export function ChampionBanner({ teamName }: { teamName: string }) {
  return (
    <View className="items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
      <Text className="text-3xl">🏆</Text>
      <Text className="text-center font-oswald text-xl font-bold text-white">{teamName}</Text>
      <Text className="font-montserrat text-[11px] font-bold uppercase tracking-widest text-amber-400">Champion</Text>
    </View>
  );
}

export function TeamLeagueEmpty({ message }: { message: string }) {
  return (
    <View className="m-4 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
      <Text className="text-4xl">🏸</Text>
      <Text className="text-center font-montserrat text-gray-400">{message}</Text>
    </View>
  );
}

export function TeamLeagueError() {
  return (
    <View className="m-4 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
      <Text className="text-4xl">⚠️</Text>
      <Text className="text-center font-montserrat text-gray-400">Couldn't load Team League. Pull down to retry.</Text>
    </View>
  );
}
