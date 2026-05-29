import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';

export default function TournamentDetail() {
  const { id } = useLocalSearchParams();

  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text className="font-oswald text-2xl text-brand">Tournament {id}</Text>
        <Text className="mt-2 font-montserrat text-white">Detail screen coming soon</Text>
      </View>
    </Screen>
  );
}
