import { View, Text } from 'react-native';

function Notice({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View className="m-4 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
      <Text className="text-4xl">{emoji}</Text>
      <Text className="text-center font-montserrat text-gray-400">{text}</Text>
    </View>
  );
}

export function CricketError() {
  return <Notice emoji="⚠️" text="Couldn't load the match. Pull down to retry." />;
}

export function NotStarted() {
  return <Notice emoji="🏏" text="Match not started yet. Check back when play begins." />;
}

export function UnsupportedSport() {
  return <Notice emoji="📺" text="Live view isn't available for this sport." />;
}
