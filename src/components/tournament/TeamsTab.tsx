import { View, Text } from 'react-native';
import type { Team } from '@/store/slices/teamSlice';
export function TeamsTab(_: { myTeam: Team | null | undefined }) {
  return <View className="px-5 py-6"><Text className="font-montserrat text-gray-400">Teams…</Text></View>;
}
