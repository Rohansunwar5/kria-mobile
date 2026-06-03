import { View, Text } from 'react-native';

export function BracketEmpty() {
  return (
    <View className="m-4 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
      <Text className="text-4xl">🏆</Text>
      <Text className="text-center font-montserrat text-gray-400">
        Bracket not generated yet. Check back after the auction completes.
      </Text>
    </View>
  );
}

export function TeamLeagueNotice() {
  return (
    <View className="m-4 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
      <Text className="text-4xl">🏆</Text>
      <Text className="text-center font-oswald text-lg font-bold uppercase text-white">Team League Format</Text>
      <Text className="text-center font-montserrat text-sm text-gray-400">
        This category uses the Team League format (group stages, ties, sub-matches). Its standings aren't on mobile yet — view them on the web app.
      </Text>
    </View>
  );
}
